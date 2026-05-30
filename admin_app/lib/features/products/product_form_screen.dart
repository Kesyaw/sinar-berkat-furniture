import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../products/providers/product_provider.dart';
import '../products/models/product_model.dart';
import '../products/services/product_service.dart';

class ProductFormScreen extends StatefulWidget {
  final ProductModel? product;
  const ProductFormScreen({super.key, this.product});

  @override
  State<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends State<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _slugController = TextEditingController();
  final _descController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();

  String _status = 'READY_STOCK';
  String? _categoryId;
  File? _pickedImage;
  Uint8List? _webImageBytes;
  bool _isSaving = false;
  bool _isUploadingImage = false;

  bool get isEdit => widget.product != null;

  @override
  void initState() {
    super.initState();
    if (isEdit) {
      final p = widget.product!;
      _nameController.text = p.name;
      _slugController.text = p.slug;
      _descController.text = p.description ?? '';
      _priceController.text = p.basePrice;
      _stockController.text = p.stockQty?.toString() ?? '';
      _status = p.status;
      _categoryId = p.categoryId;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().loadCategories();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _slugController.dispose();
    _descController.dispose();
    _priceController.dispose();
    _stockController.dispose();
    super.dispose();
  }

  void _autoSlug(String name) {
    if (!isEdit) {
      _slugController.text = name
          .toLowerCase()
          .replaceAll(RegExp(r'[^a-z0-9\s]'), '')
          .replaceAll(RegExp(r'\s+'), '-');
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1200,
      imageQuality: 85,
    );
    if (picked != null) {
      if (kIsWeb) {
        final bytes = await picked.readAsBytes();
        setState(() {
          _webImageBytes = bytes;
          _pickedImage = File(picked.path);
        });
      } else {
        setState(() => _pickedImage = File(picked.path));
      }
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_categoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih kategori terlebih dahulu')),
      );
      return;
    }

    setState(() => _isSaving = true);

    final data = {
      'name': _nameController.text.trim(),
      'slug': _slugController.text.trim(),
      'description': _descController.text.trim(),
      'basePrice': _priceController.text.trim(),
      'status': _status,
      'categoryId': _categoryId,
      if (_stockController.text.isNotEmpty)
        'stockQty': int.tryParse(_stockController.text),
    };

    final provider = context.read<ProductProvider>();
    bool success;
    String? productId;

    if (isEdit) {
      success = await provider.updateProduct(widget.product!.id, data);
      productId = widget.product!.id;
    } else {
      try {
        final result = await provider.createProductAndGetId(data);
        success = result != null;
        productId = result;
      } catch (_) {
        success = false;
      }
    }

    if (success && productId != null &&
        (kIsWeb ? _webImageBytes != null : _pickedImage != null)) {
      setState(() => _isUploadingImage = true);
      try {
        await ProductService().uploadImage(
          productId,
          _pickedImage ?? File(''),
          isPrimary: true,
          webBytes: kIsWeb ? _webImageBytes : null,
          webFileName: 'product_image.jpg',
        );
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Produk disimpan tapi foto gagal: $e')),
          );
        }
      }
      setState(() => _isUploadingImage = false);
    }

    setState(() => _isSaving = false);

    if (mounted) {
      if (success) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEdit ? 'Produk diperbarui' : 'Produk ditambahkan'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.error ?? 'Gagal menyimpan'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildImagePlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.add_photo_alternate, size: 48, color: Colors.grey[400]),
        const SizedBox(height: 8),
        Text('Tap untuk pilih foto',
            style: TextStyle(color: Colors.grey[500])),
      ],
    );
  }

  Widget _buildImagePreview() {
    if (kIsWeb && _webImageBytes != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.memory(_webImageBytes!, fit: BoxFit.cover),
      );
    }
    if (!kIsWeb && _pickedImage != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.file(_pickedImage!, fit: BoxFit.cover),
      );
    }
    if (isEdit && widget.product!.primaryImageUrl != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          widget.product!.primaryImageUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildImagePlaceholder(),
        ),
      );
    }
    return _buildImagePlaceholder();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEdit ? 'Edit Produk' : 'Tambah Produk'),
        backgroundColor: const Color(0xFF44403C),
        foregroundColor: Colors.white,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Image Picker
            GestureDetector(
              onTap: _pickImage,
              child: Container(
                height: 180,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: _buildImagePreview(),
              ),
            ),
            const SizedBox(height: 16),

            // Nama
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nama Produk *',
                border: OutlineInputBorder(),
              ),
              onChanged: _autoSlug,
              validator: (v) =>
              v == null || v.isEmpty ? 'Nama wajib diisi' : null,
            ),
            const SizedBox(height: 12),

            // Slug
            TextFormField(
              controller: _slugController,
              decoration: const InputDecoration(
                labelText: 'Slug *',
                border: OutlineInputBorder(),
                helperText: 'URL-friendly, contoh: kursi-tamu-jati',
              ),
              validator: (v) =>
              v == null || v.isEmpty ? 'Slug wajib diisi' : null,
            ),
            const SizedBox(height: 12),

            // Kategori
            Consumer<ProductProvider>(
              builder: (context, provider, _) {
                return DropdownButtonFormField<String>(
                  value: _categoryId,
                  decoration: const InputDecoration(
                    labelText: 'Kategori *',
                    border: OutlineInputBorder(),
                  ),
                  items: provider.categories
                      .map((c) => DropdownMenuItem(
                    value: c.id,
                    child: Text(c.name),
                  ))
                      .toList(),
                  onChanged: (v) => setState(() => _categoryId = v),
                  hint: provider.categories.isEmpty
                      ? const Text('Belum ada kategori')
                      : const Text('Pilih kategori'),
                );
              },
            ),
            const SizedBox(height: 12),

            // Harga
            TextFormField(
              controller: _priceController,
              decoration: const InputDecoration(
                labelText: 'Harga Dasar (Rp) *',
                border: OutlineInputBorder(),
                prefixText: 'Rp ',
              ),
              keyboardType: TextInputType.number,
              validator: (v) {
                if (v == null || v.isEmpty) return 'Harga wajib diisi';
                final price = double.tryParse(v);
                if (price == null) return 'Harga tidak valid';
                if (price <= 0) return 'Harga harus lebih dari 0';
                if (price >= 9999999999) {
                  return 'Harga terlalu besar (maks Rp 9.999.999.999)';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),

            // Status
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(
                labelText: 'Status *',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(
                    value: 'READY_STOCK', child: Text('Ready Stock')),
                DropdownMenuItem(
                    value: 'PREORDER', child: Text('Pre-Order')),
                DropdownMenuItem(
                    value: 'OUT_OF_STOCK', child: Text('Habis')),
              ],
              onChanged: (v) => setState(() => _status = v!),
            ),
            const SizedBox(height: 12),

            // Stok
            TextFormField(
              controller: _stockController,
              decoration: const InputDecoration(
                labelText: 'Stok (opsional)',
                border: OutlineInputBorder(),
                helperText: 'Kosongkan jika preorder',
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),

            // Deskripsi
            TextFormField(
              controller: _descController,
              decoration: const InputDecoration(
                labelText: 'Deskripsi',
                border: OutlineInputBorder(),
              ),
              maxLines: 4,
            ),
            const SizedBox(height: 24),

            // Save Button
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF44403C),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                child: _isSaving
                    ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(_isUploadingImage
                        ? 'Mengupload foto...'
                        : 'Menyimpan...'),
                  ],
                )
                    : Text(isEdit ? 'Simpan Perubahan' : 'Tambah Produk'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
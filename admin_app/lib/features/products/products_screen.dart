import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../products/providers/product_provider.dart';
import '../products/models/product_model.dart';
import '../products/product_form_screen.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _searchController = TextEditingController();
  String? _selectedStatus;

  final _statusOptions = [
    {'label': 'Semua', 'value': null},
    {'label': 'Ready Stock', 'value': 'READY_STOCK'},
    {'label': 'Preorder', 'value': 'PREORDER'},
    {'label': 'Habis', 'value': 'OUT_OF_STOCK'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<ProductProvider>();
      provider.loadCategories();
      provider.loadProducts(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _search() {
    context.read<ProductProvider>().loadProducts(
      search: _searchController.text,
      status: _selectedStatus,
      refresh: true,
    );
  }

  Future<void> _deleteProduct(ProductModel product) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Hapus Produk'),
        content: Text('Hapus "${product.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (confirm == true && mounted) {
      final success =
      await context.read<ProductProvider>().deleteProduct(product.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(success ? 'Produk dihapus' : 'Gagal menghapus'),
          backgroundColor: success ? Colors.green : Colors.red,
        ));
      }
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'READY_STOCK':
        return Colors.green;
      case 'PREORDER':
        return Colors.orange;
      case 'CUSTOM':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'READY_STOCK':
        return 'Ready';
      case 'PREORDER':
        return 'PO';
      case 'CUSTOM':
        return 'Custom';
      default:
        return 'Habis';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Produk'),
        backgroundColor: const Color(0xFF44403C),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => const ProductFormScreen()),
            ).then((_) => context
                .read<ProductProvider>()
                .loadProducts(refresh: true)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Bar
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Cari produk...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.send),
                      onPressed: _search,
                    ),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                    isDense: true,
                  ),
                  onSubmitted: (_) => _search(),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _statusOptions.map((opt) {
                      final isSelected = _selectedStatus == opt['value'];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(opt['label'] as String),
                          selected: isSelected,
                          onSelected: (_) {
                            setState(
                                    () => _selectedStatus = opt['value'] as String?);
                            _search();
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // Product List
          Expanded(
            child: Consumer<ProductProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading && provider.products.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (provider.error != null && provider.products.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(provider.error!,
                            style: const TextStyle(color: Colors.red)),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () =>
                              provider.loadProducts(refresh: true),
                          child: const Text('Coba lagi'),
                        ),
                      ],
                    ),
                  );
                }
                if (provider.products.isEmpty) {
                  return const Center(child: Text('Belum ada produk'));
                }
                return RefreshIndicator(
                  onRefresh: () => provider.loadProducts(refresh: true),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: provider.products.length,
                    itemBuilder: (context, index) {
                      final product = provider.products[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: product.primaryImageUrl != null
                                ? Image.network(
                              product.primaryImageUrl!,
                              width: 56,
                              height: 56,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) =>
                                  _placeholder(),
                            )
                                : _placeholder(),
                          ),
                          title: Text(product.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            'Rp ${_formatPrice(product.basePrice)}',
                            style: const TextStyle(color: Color(0xFF44403C)),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _statusColor(product.status)
                                      .withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  _statusLabel(product.status),
                                  style: TextStyle(
                                    color: _statusColor(product.status),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              PopupMenuButton<String>(
                                onSelected: (value) {
                                  if (value == 'edit') {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ProductFormScreen(
                                            product: product),
                                      ),
                                    ).then((_) => provider.loadProducts(
                                        refresh: true));
                                  } else if (value == 'delete') {
                                    _deleteProduct(product);
                                  }
                                },
                                itemBuilder: (_) => [
                                  const PopupMenuItem(
                                      value: 'edit',
                                      child: Row(children: [
                                        Icon(Icons.edit, size: 16),
                                        SizedBox(width: 8),
                                        Text('Edit')
                                      ])),
                                  const PopupMenuItem(
                                      value: 'delete',
                                      child: Row(children: [
                                        Icon(Icons.delete,
                                            size: 16, color: Colors.red),
                                        SizedBox(width: 8),
                                        Text('Hapus',
                                            style: TextStyle(
                                                color: Colors.red))
                                      ])),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() => Container(
    width: 56,
    height: 56,
    color: Colors.grey[200],
    child: const Icon(Icons.chair, color: Colors.grey),
  );

  String _formatPrice(String price) {
    final num = double.tryParse(price) ?? 0;
    return num.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
  }
}
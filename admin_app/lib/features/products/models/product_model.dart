class ProductImage {
  final String id;
  final String storagePath;
  final bool isPrimary;
  final String? publicUrl;

  ProductImage({
    required this.id,
    required this.storagePath,
    required this.isPrimary,
    this.publicUrl,
  });

  factory ProductImage.fromJson(Map<String, dynamic> json) => ProductImage(
    id: json['id'],
    storagePath: json['storagePath'],
    isPrimary: json['isPrimary'] ?? false,
    publicUrl: json['publicUrl'],
  );
}

class ProductModel {
  final String id;
  final String name;
  final String slug;
  final String categoryId;
  final String? description;
  final String basePrice;
  final String status;
  final int? stockQty;
  final List<ProductImage> images;
  final Map<String, dynamic>? category;

  ProductModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.categoryId,
    this.description,
    required this.basePrice,
    required this.status,
    this.stockQty,
    required this.images,
    this.category,
  });

  String? get primaryImageUrl {
    if (images.isEmpty) return null;
    final primary = images.where((i) => i.isPrimary).toList();
    // Construct public URL from storagePath
    const supabaseUrl = 'https://brsmsxqddpsprayawwde.supabase.co';
    final path = primary.isNotEmpty
        ? primary.first.storagePath
        : images.first.storagePath;
    return '$supabaseUrl/storage/v1/object/public/product-images/$path';
  }

  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
    id: json['id'],
    name: json['name'],
    slug: json['slug'],
    categoryId: json['categoryId'],
    description: json['description'],
    basePrice: json['basePrice'].toString(),
    status: json['status'],
    stockQty: json['stockQty'],
    images: (json['images'] as List<dynamic>? ?? [])
        .map((i) => ProductImage.fromJson(i))
        .toList(),
    category: json['category'],
  );
}
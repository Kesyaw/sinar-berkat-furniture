import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/api/api_client.dart';
import '../models/product_model.dart';
import '../models/category_model.dart';

class ProductService {
  static const String baseUrl = ApiClient.baseUrl;

  static String? get _token =>
      Supabase.instance.client.auth.currentSession?.accessToken;

  Future<List<CategoryModel>> getCategories() async {
    final result = await ApiClient.get('/categories');
    final list = result['data'] as List<dynamic>? ??
        (result.values.first is List ? result.values.first : []);
    return (list as List).map((e) => CategoryModel.fromJson(e)).toList();
  }

  Future<Map<String, dynamic>> getProducts({
    String? categoryId,
    String? status,
    String? search,
    int page = 1,
  }) async {
    String path = '/products?page=$page&limit=20';
    if (categoryId != null) path += '&categoryId=$categoryId';
    if (status != null) path += '&status=$status';
    if (search != null && search.isNotEmpty) path += '&search=$search';
    return ApiClient.get(path);
  }

  Future<ProductModel> createProduct(Map<String, dynamic> data) async {
    final result = await ApiClient.post('/products', data);
    return ProductModel.fromJson(result);
  }

  Future<ProductModel> updateProduct(
      String id, Map<String, dynamic> data) async {
    final result = await ApiClient.put('/products/$id', data);
    return ProductModel.fromJson(result);
  }

  Future<void> deleteProduct(String id) async {
    await ApiClient.delete('/products/$id');
  }

  // Upload dengan File (mobile) atau Uint8List (web)
  Future<void> uploadImage(
      String productId,
      File imageFile, {
        bool isPrimary = false,
        Uint8List? webBytes,
        String? webFileName,
      }) async {
    final token = _token;
    if (token == null) throw Exception('Not authenticated');

    final uri = Uri.parse('$baseUrl/products/$productId/images?primary=$isPrimary');
    final request = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $token';

    if (kIsWeb && webBytes != null) {
      // Web: pakai bytes langsung
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        webBytes,
        filename: webFileName ?? 'image.jpg',
      ));
    } else {
      // Mobile: pakai file path
      request.files.add(await http.MultipartFile.fromPath(
        'file',
        imageFile.path,
      ));
    }

    final response = await request.send();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Image upload failed: ${response.statusCode}');
    }
  }
}
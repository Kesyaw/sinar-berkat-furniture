import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../models/category_model.dart';
import '../services/product_service.dart';

class ProductProvider extends ChangeNotifier {
  final _service = ProductService();

  List<ProductModel> _products = [];
  List<CategoryModel> _categories = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  int _total = 0;

  List<ProductModel> get products => _products;
  List<CategoryModel> get categories => _categories;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _products.length < _total;

  Future<void> loadCategories() async {
    try {
      _categories = await _service.getCategories();
      notifyListeners();
    } catch (e) {
      // categories gagal tidak fatal
    }
  }

  Future<void> loadProducts({
    String? categoryId,
    String? status,
    String? search,
    bool refresh = false,
  }) async {
    if (refresh) {
      _currentPage = 1;
      _products = [];
    }
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _service.getProducts(
        categoryId: categoryId,
        status: status,
        search: search,
        page: _currentPage,
      );
      final items = (result['items'] as List)
          .map((e) => ProductModel.fromJson(e))
          .toList();
      _total = result['total'] ?? 0;
      _products = refresh ? items : [..._products, ...items];
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createProduct(Map<String, dynamic> data) async {
    try {
      await _service.createProduct(data);
      await loadProducts(refresh: true);
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateProduct(String id, Map<String, dynamic> data) async {
    try {
      await _service.updateProduct(id, data);
      await loadProducts(refresh: true);
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteProduct(String id) async {
    try {
      await _service.deleteProduct(id);
      _products.removeWhere((p) => p.id == id);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  // Tambahkan di dalam class ProductProvider
  Future<String?> createProductAndGetId(Map<String, dynamic> data) async {
    try {
      final product = await _service.createProduct(data);
      await loadProducts(refresh: true);
      return product.id;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return null;
    }
  }

}
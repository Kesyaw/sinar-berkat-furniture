import 'package:flutter/material.dart';
import '../models/order_model.dart';
import '../services/order_service.dart';

class OrderProvider extends ChangeNotifier {
  final _service = OrderService();

  List<OrderModel> _orders = [];
  OrderModel? _selectedOrder;
  bool _isLoading = false;
  String? _error;
  int _total = 0;

  List<OrderModel> get orders => _orders;
  OrderModel? get selectedOrder => _selectedOrder;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get total => _total;

  Future<void> loadOrders({
    String? status,
    String? search,
    bool refresh = false,
  }) async {
    _isLoading = true;
    _error = null;
    if (refresh) _orders = [];
    notifyListeners();

    try {
      final result = await _service.getOrders(status: status, search: search);
      final items = (result['items'] as List)
          .map((e) => OrderModel.fromJson(e))
          .toList();
      _total = result['total'] ?? 0;
      _orders = items;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadOrder(String id) async {
    _isLoading = true;
    notifyListeners();
    try {
      _selectedOrder = await _service.getOrder(id);
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateStatus(String id, String status, {String? adminNotes}) async {
    try {
      final updated = await _service.updateStatus(id, status, adminNotes: adminNotes);
      _selectedOrder = updated;
      final idx = _orders.indexWhere((o) => o.id == id);
      if (idx != -1) _orders[idx] = updated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateShipping(String id, double cost) async {
    try {
      final updated = await _service.updateShipping(id, cost);
      _selectedOrder = updated;
      final idx = _orders.indexWhere((o) => o.id == id);
      if (idx != -1) _orders[idx] = updated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }
}
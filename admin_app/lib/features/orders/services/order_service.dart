import '../../../core/api/api_client.dart';
import '../models/order_model.dart';

class OrderService {
  Future<Map<String, dynamic>> getOrders({
    String? status,
    String? search,
    int page = 1,
  }) async {
    String path = '/orders?page=$page&limit=20';
    if (status != null) path += '&status=$status';
    if (search != null && search.isNotEmpty) path += '&search=$search';
    return ApiClient.get(path);
  }

  Future<OrderModel> getOrder(String id) async {
    final result = await ApiClient.get('/orders/$id');
    return OrderModel.fromJson(result);
  }

  Future<OrderModel> updateStatus(String id, String status, {String? adminNotes}) async {
    final body = <String, dynamic>{'status': status};
    if (adminNotes != null) body['adminNotes'] = adminNotes;
    final result = await ApiClient.patch('/orders/$id/status', body);
    return OrderModel.fromJson(result);
  }

  Future<OrderModel> updateShipping(String id, double shippingCost) async {
    final result = await ApiClient.patch(
        '/orders/$id/shipping', {'shippingCost': shippingCost});
    return OrderModel.fromJson(result);
  }
}
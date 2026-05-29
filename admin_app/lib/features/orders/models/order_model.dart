class OrderItemModel {
  final String id;
  final String productName;
  final String unitPrice;
  final int quantity;
  final String subtotal;

  OrderItemModel({
    required this.id,
    required this.productName,
    required this.unitPrice,
    required this.quantity,
    required this.subtotal,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) => OrderItemModel(
    id: json['id'],
    productName: json['productName'],
    unitPrice: json['unitPrice'].toString(),
    quantity: json['quantity'],
    subtotal: json['subtotal'].toString(),
  );
}

class OrderModel {
  final String id;
  final String orderNumber;
  final String status;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;
  final String shippingAddress;
  final String subtotal;
  final String shippingCost;
  final String total;
  final String? notes;
  final String? adminNotes;
  final DateTime createdAt;
  final List<OrderItemModel> items;
  final Map<String, dynamic>? invoice;

  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.customerName,
    required this.customerPhone,
    this.customerEmail,
    required this.shippingAddress,
    required this.subtotal,
    required this.shippingCost,
    required this.total,
    this.notes,
    this.adminNotes,
    required this.createdAt,
    required this.items,
    this.invoice,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) => OrderModel(
    id: json['id'],
    orderNumber: json['orderNumber'],
    status: json['status'],
    customerName: json['customerName'],
    customerPhone: json['customerPhone'],
    customerEmail: json['customerEmail'],
    shippingAddress: json['shippingAddress'],
    subtotal: json['subtotal'].toString(),
    shippingCost: json['shippingCost'].toString(),
    total: json['total'].toString(),
    notes: json['notes'],
    adminNotes: json['adminNotes'],
    createdAt: DateTime.parse(json['createdAt']),
    items: (json['items'] as List<dynamic>? ?? [])
        .map((i) => OrderItemModel.fromJson(i))
        .toList(),
    invoice: json['invoice'],
  );
}
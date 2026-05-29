import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../orders/providers/order_provider.dart';
import '../orders/models/order_model.dart';
import '../orders/order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _searchController = TextEditingController();
  String? _selectedStatus;

  final _statusOptions = [
    {'label': 'Semua', 'value': null},
    {'label': 'Review', 'value': 'PENDING_REVIEW'},
    {'label': 'Bayar', 'value': 'WAITING_PAYMENT'},
    {'label': 'Proses', 'value': 'PROCESSING'},
    {'label': 'Produksi', 'value': 'PRODUCTION'},
    {'label': 'Kirim', 'value': 'SHIPPED'},
    {'label': 'Selesai', 'value': 'COMPLETED'},
    {'label': 'Batal', 'value': 'CANCELLED'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OrderProvider>().loadOrders(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'PENDING_REVIEW': return Colors.orange;
      case 'WAITING_PAYMENT': return Colors.blue;
      case 'PROCESSING': return Colors.purple;
      case 'PRODUCTION': return Colors.indigo;
      case 'SHIPPED': return Colors.teal;
      case 'COMPLETED': return Colors.green;
      case 'CANCELLED': return Colors.red;
      default: return Colors.grey;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'PENDING_REVIEW': return 'Review';
      case 'WAITING_PAYMENT': return 'Menunggu Bayar';
      case 'PROCESSING': return 'Diproses';
      case 'PRODUCTION': return 'Produksi';
      case 'SHIPPED': return 'Dikirim';
      case 'COMPLETED': return 'Selesai';
      case 'CANCELLED': return 'Dibatal';
      default: return status;
    }
  }

  String _formatPrice(String price) {
    final num = double.tryParse(price) ?? 0;
    return num.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Order'),
        backgroundColor: const Color(0xFF44403C),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Cari order / nama customer...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.send),
                      onPressed: () => context.read<OrderProvider>().loadOrders(
                        search: _searchController.text,
                        status: _selectedStatus,
                        refresh: true,
                      ),
                    ),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                    isDense: true,
                  ),
                  onSubmitted: (_) => context.read<OrderProvider>().loadOrders(
                    search: _searchController.text,
                    status: _selectedStatus,
                    refresh: true,
                  ),
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
                            setState(() =>
                            _selectedStatus = opt['value'] as String?);
                            context.read<OrderProvider>().loadOrders(
                              status: _selectedStatus,
                              search: _searchController.text,
                              refresh: true,
                            );
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Consumer<OrderProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading && provider.orders.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (provider.error != null && provider.orders.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(provider.error!,
                            style: const TextStyle(color: Colors.red)),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () =>
                              provider.loadOrders(refresh: true),
                          child: const Text('Coba lagi'),
                        ),
                      ],
                    ),
                  );
                }
                if (provider.orders.isEmpty) {
                  return const Center(child: Text('Belum ada order'));
                }
                return RefreshIndicator(
                  onRefresh: () => provider.loadOrders(refresh: true),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: provider.orders.length,
                    itemBuilder: (context, index) {
                      final order = provider.orders[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  OrderDetailScreen(orderId: order.id),
                            ),
                          ).then((_) =>
                              provider.loadOrders(refresh: true)),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      order.orderNumber,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: _statusColor(order.status)
                                            .withOpacity(0.15),
                                        borderRadius:
                                        BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        _statusLabel(order.status),
                                        style: TextStyle(
                                          color: _statusColor(order.status),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  order.customerName,
                                  style: const TextStyle(fontSize: 14),
                                ),
                                Text(
                                  order.customerPhone,
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600]),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${order.items.length} item',
                                      style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600]),
                                    ),
                                    Text(
                                      'Rp ${_formatPrice(order.total)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF44403C),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
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
}
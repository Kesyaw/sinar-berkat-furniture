import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../orders/providers/order_provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final _shippingController = TextEditingController();
  final _notesController = TextEditingController();

  final _nextStatus = {
    'PENDING_REVIEW': 'WAITING_PAYMENT',
    'WAITING_PAYMENT': 'PROCESSING',
    'PROCESSING': 'SHIPPED',
    'PRODUCTION': 'SHIPPED',
    'SHIPPED': 'COMPLETED',
  };

  final _nextStatusLabel = {
    'PENDING_REVIEW': 'Konfirmasi → Tunggu Bayar',
    'WAITING_PAYMENT': 'Tandai Diproses',
    'PROCESSING': 'Tandai Dikirim',
    'PRODUCTION': 'Tandai Dikirim',
    'SHIPPED': 'Tandai Selesai',
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OrderProvider>().loadOrder(widget.orderId);
    });
  }

  @override
  void dispose() {
    _shippingController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  String _formatPrice(String price) {
    final num = double.tryParse(price) ?? 0;
    return num.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
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

  Future<void> _updateStatus(String newStatus) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Update Status'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Update status ke "$newStatus"?'),
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Catatan admin (opsional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Update'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final success = await context.read<OrderProvider>().updateStatus(
        widget.orderId,
        newStatus,
        adminNotes: _notesController.text.isNotEmpty
            ? _notesController.text
            : null,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(success ? 'Status diupdate' : 'Gagal update status'),
          backgroundColor: success ? Colors.green : Colors.red,
        ));
      }
    }
  }

  Future<void> _updateShipping() async {
    final cost = double.tryParse(_shippingController.text);
    if (cost == null) return;
    final success = await context
        .read<OrderProvider>()
        .updateShipping(widget.orderId, cost);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content:
        Text(success ? 'Ongkir diupdate' : 'Gagal update ongkir'),
        backgroundColor: success ? Colors.green : Colors.red,
      ));
    }
  }

  Future<void> _openWhatsApp() async {
    try {
      final result = await ApiClient.get('/orders/${widget.orderId}/whatsapp-message');
      final url = result['whatsappUrl'] as String;
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal buka WhatsApp: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Order'),
        backgroundColor: const Color(0xFF44403C),
        foregroundColor: Colors.white,
      ),
      body: Consumer<OrderProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          final order = provider.selectedOrder;
          if (order == null) {
            return const Center(child: Text('Order tidak ditemukan'));
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Status badge
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color:
                      _statusColor(order.status).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      order.status.replaceAll('_', ' '),
                      style: TextStyle(
                        color: _statusColor(order.status),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(order.orderNumber,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
              const SizedBox(height: 16),

              // Customer info
              _sectionCard('Informasi Customer', [
                _infoRow('Nama', order.customerName),
                _infoRow('Phone', order.customerPhone),
                if (order.customerEmail != null)
                  _infoRow('Email', order.customerEmail!),
                _infoRow('Alamat', order.shippingAddress),
                if (order.notes != null)
                  _infoRow('Catatan', order.notes!),
              ]),
              const SizedBox(height: 12),

              // Tombol WhatsApp
              Card(
                color: const Color(0xFF25D366).withOpacity(0.1),
                child: InkWell(
                  onTap: _openWhatsApp,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF25D366),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.chat, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Hubungi Customer via WhatsApp',
                                style: TextStyle(fontWeight: FontWeight.w600)),
                            Text(
                              order.customerPhone,
                              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                            ),
                          ],
                        ),
                        const Spacer(),
                        const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Items
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Item Order',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 14)),
                      const Divider(),
                      ...order.items.map((item) => Padding(
                        padding:
                        const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisAlignment:
                          MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${item.productName} x${item.quantity}',
                                style: const TextStyle(fontSize: 13),
                              ),
                            ),
                            Text(
                              'Rp ${_formatPrice(item.subtotal)}',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      )),
                      const Divider(),
                      _infoRow('Subtotal',
                          'Rp ${_formatPrice(order.subtotal)}'),
                      _infoRow('Ongkir',
                          'Rp ${_formatPrice(order.shippingCost)}'),
                      _infoRow(
                          'Total', 'Rp ${_formatPrice(order.total)}',
                          bold: true),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Update ongkir (hanya saat PENDING_REVIEW)
              if (order.status == 'PENDING_REVIEW') ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Set Ongkos Kirim',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _shippingController,
                                decoration: const InputDecoration(
                                  prefixText: 'Rp ',
                                  labelText: 'Ongkir',
                                  border: OutlineInputBorder(),
                                  isDense: true,
                                ),
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: _updateShipping,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF44403C),
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('Set'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Admin notes
              if (order.adminNotes != null)
                _sectionCard('Catatan Admin', [
                  Text(order.adminNotes!,
                      style: const TextStyle(fontSize: 13)),
                ]),

              // Action button
              if (_nextStatus.containsKey(order.status)) ...[
                const SizedBox(height: 8),
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () =>
                        _updateStatus(_nextStatus[order.status]!),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _statusColor(order.status),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(_nextStatusLabel[order.status]!),
                  ),
                ),
              ],

              // Cancel button
              if (!['COMPLETED', 'CANCELLED'].contains(order.status)) ...[
                const SizedBox(height: 8),
                SizedBox(
                  height: 44,
                  child: OutlinedButton(
                    onPressed: () => _updateStatus('CANCELLED'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Batalkan Order'),
                  ),
                ),
              ],
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }

  Widget _sectionCard(String title, List<Widget> children) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 14)),
            const Divider(),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label,
                style: TextStyle(
                    color: Colors.grey[600], fontSize: 12)),
          ),
          Expanded(
            child: Text(value,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight:
                    bold ? FontWeight.bold : FontWeight.normal)),
          ),
        ],
      ),
    );
  }
}
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService extends ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isLoading = true;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get token => Supabase.instance.client.auth.currentSession?.accessToken;

  static const _supabaseUrl = 'https://brsmsxqddpsprayawwde.supabase.co';
  static const _supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyc21zeHFkZHBzcHJheWF3d2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODY0MDgsImV4cCI6MjA5NTI2MjQwOH0.7LBvdkaBXPcl6PQ6X7240Ae4x-WZWF0aswp_ABdwZdU';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: _supabaseUrl,
      anonKey: _supabaseAnonKey,
    );
  }

  AuthService() {
    _checkAuth();
  }

  void _checkAuth() {
    final session = Supabase.instance.client.auth.currentSession;
    _isAuthenticated = session != null;
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await Supabase.instance.client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      if (response.session != null) {
        _isAuthenticated = true;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    await Supabase.instance.client.auth.signOut();
    _isAuthenticated = false;
    notifyListeners();
  }
}
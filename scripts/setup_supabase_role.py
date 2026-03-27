#!/usr/bin/env python3
"""
Script to add 'role' column to users table in Supabase
"""
from supabase import create_client, Client
import os

SUPABASE_URL = "https://kmhhazpyalpjwspjxzry.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaGhhenB5YWxwandzcGp4enJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODIyNzEsImV4cCI6MjA3ODQ1ODI3MX0.adj7b0hh3deVFN4JK6_s0Vjx_KtdLs9N9LaVkQQ__BA"

def main():
    print("🔌 Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # First, check current users
        print("\n📋 Checking current users...")
        response = supabase.table('users').select('*').execute()
        print(f"Found {len(response.data)} users")
        
        # Update admin user
        print("\n🔐 Setting role='admin' for admin user...")
        admin_response = supabase.table('users').update({
            'role': 'admin'
        }).eq('phone', 'admin').execute()
        
        if admin_response.data:
            print(f"✅ Admin user updated: {admin_response.data}")
        else:
            print("⚠️ Admin user not found or already has role field")
        
        # Update all other users to 'student' if role is missing
        print("\n👨‍🎓 Setting role='student' for other users...")
        student_response = supabase.table('users').update({
            'role': 'student'
        }).neq('phone', 'admin').execute()
        
        print(f"✅ Updated {len(student_response.data) if student_response.data else 0} student users")
        
        # Verify changes
        print("\n🔍 Verifying changes...")
        all_users = supabase.table('users').select('id, phone, display_name, role').execute()
        for user in all_users.data:
            print(f"  - {user.get('phone')}: role={user.get('role', 'NOT SET')}")
        
        print("\n✅ Supabase role field setup complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

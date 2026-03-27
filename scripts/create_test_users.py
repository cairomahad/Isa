#!/usr/bin/env python3
"""
Create test users with phone and password
"""
from supabase import create_client, Client

SUPABASE_URL = "https://kmhhazpyalpjwspjxzry.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaGhhenB5YWxwandzcGp4enJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODIyNzEsImV4cCI6MjA3ODQ1ODI3MX0.adj7b0hh3deVFN4JK6_s0Vjx_KtdLs9N9LaVkQQ__BA"

def main():
    print("🔌 Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Create admin user
        print("\n🔐 Creating admin user...")
        admin_data = {
            'phone': 'admin',
            'password': 'admin123',
            'display_name': 'Администратор',
            'telegram_id': 999999999,
        }
        
        # Check if admin exists
        existing_admin = supabase.table('users').select('*').eq('phone', 'admin').execute()
        
        if existing_admin.data and len(existing_admin.data) > 0:
            print("  Admin already exists, updating...")
            supabase.table('users').update(admin_data).eq('phone', 'admin').execute()
        else:
            print("  Creating new admin...")
            supabase.table('users').insert(admin_data).execute()
        
        print("  ✅ Admin user ready: phone=admin, password=admin123")
        
        # Create student user
        print("\n👨‍🎓 Creating student user...")
        student_data = {
            'phone': '1234567890',
            'password': 'test123',
            'display_name': 'Тестовый Студент',
            'telegram_id': 888888888,
        }
        
        existing_student = supabase.table('users').select('*').eq('phone', '1234567890').execute()
        
        if existing_student.data and len(existing_student.data) > 0:
            print("  Student already exists, updating...")
            supabase.table('users').update(student_data).eq('phone', '1234567890').execute()
        else:
            print("  Creating new student...")
            supabase.table('users').insert(student_data).execute()
        
        print("  ✅ Student user ready: phone=1234567890, password=test123")
        
        # Show all users with phone
        print("\n📋 All users with phone/password:")
        all_users = supabase.table('users').select('id, phone, password, display_name, telegram_id').execute()
        
        for user in all_users.data:
            if user.get('phone'):
                print(f"  - {user.get('phone')}: {user.get('display_name')} (id={user.get('id')}, tg_id={user.get('telegram_id')})")
        
        print("\n✅ Test users setup complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

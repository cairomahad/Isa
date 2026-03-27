#!/usr/bin/env python3
"""
Check Supabase table structure
"""
from supabase import create_client, Client

SUPABASE_URL = "https://kmhhazpyalpjwspjxzry.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaGhhenB5YWxwandzcGp4enJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODIyNzEsImV4cCI6MjA3ODQ1ODI3MX0.adj7b0hh3deVFN4JK6_s0Vjx_KtdLs9N9LaVkQQ__BA"

def main():
    print("🔌 Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    tables = ['users', 'video_lessons', 'course_progress', 'hadiths', 'stories', 'benefits']
    
    for table_name in tables:
        print(f"\n📋 Table: {table_name}")
        print("=" * 60)
        
        try:
            # Fetch one record to see structure
            response = supabase.table(table_name).select('*').limit(1).execute()
            
            if response.data and len(response.data) > 0:
                record = response.data[0]
                print(f"Columns ({len(record)} total):")
                for key in record.keys():
                    value = record[key]
                    value_type = type(value).__name__
                    value_preview = str(value)[:50] if value else 'NULL'
                    print(f"  - {key}: {value_type} = {value_preview}")
            else:
                print("  (No records found)")
            
            # Get count
            count_response = supabase.table(table_name).select('id', count='exact').execute()
            print(f"\nTotal records: {count_response.count}")
            
        except Exception as e:
            print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    main()

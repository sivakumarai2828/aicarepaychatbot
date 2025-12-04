#!/usr/bin/env python3
"""
Test script to send an email using Resend API
"""
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import resend

# Add parent directory to path to import email_templates
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from email_templates import get_receipt_html

# Load environment variables
load_dotenv()

# Configure Resend
resend_api_key = os.getenv("RESEND_API_KEY")
if not resend_api_key:
    print("❌ RESEND_API_KEY not found in .env file")
    sys.exit(1)

resend.api_key = resend_api_key
print(f"✅ Resend API key loaded: {resend_api_key[:10]}...")

# Test email details
test_email = "sivakumar.kk@gmail.com"
transaction_id = f"TEST-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
amount = "850.50"
date_str = datetime.now().strftime("%B %d, %Y")
payment_method = "Credit Card"

print(f"\n📧 Preparing to send test email...")
print(f"   To: {test_email}")
print(f"   Transaction ID: {transaction_id}")
print(f"   Amount: ${amount}")

# Generate HTML content
html_content = get_receipt_html(transaction_id, amount, date_str, payment_method)
print(f"✅ HTML template generated ({len(html_content)} characters)")

# Send email
try:
    email_params = {
        "from": "CareCredit Support <onboarding@resend.dev>",
        "to": [test_email],
        "subject": f"Test Payment Receipt - {transaction_id}",
        "html": html_content
    }
    
    print(f"\n🚀 Sending email via Resend...")
    response = resend.Emails.send(email_params)
    
    print(f"\n✅ Email sent successfully!")
    print(f"   Email ID: {response['id']}")
    print(f"\n📬 Check your inbox (and spam folder) at: {test_email}")
    print(f"   Subject: Test Payment Receipt - {transaction_id}")
    
except Exception as e:
    print(f"\n❌ Error sending email: {e}")
    sys.exit(1)

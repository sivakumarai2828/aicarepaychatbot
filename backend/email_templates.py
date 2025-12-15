def get_receipt_html(transaction_id, amount, date, payment_method):
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            padding: 40px 20px;
            line-height: 1.6;
        }}
        .email-wrapper {{
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }}
        .header {{
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }}
        .logo {{
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
        }}
        .tagline {{
            font-size: 14px;
            opacity: 0.95;
            font-weight: 400;
        }}
        .success-badge {{
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50px;
            padding: 12px 24px;
            display: inline-block;
            margin-top: 20px;
            font-weight: 600;
            font-size: 14px;
        }}
        .content {{
            padding: 40px 30px;
        }}
        .greeting {{
            font-size: 24px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 16px;
        }}
        .message {{
            color: #64748b;
            font-size: 16px;
            margin-bottom: 32px;
            line-height: 1.6;
        }}
        .receipt-card {{
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
        }}
        .receipt-table {{
            width: 100%;
            border-collapse: collapse;
        }}
        .receipt-table td {{
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }}
        .receipt-table tr:last-child td {{
            border-bottom: none;
            padding-top: 20px;
            border-top: 2px solid #cbd5e1;
        }}
        .receipt-label {{
            color: #64748b;
            font-size: 14px;
            font-weight: 500;
            text-align: left;
            padding-right: 20px;
        }}
        .receipt-value {{
            color: #0f172a;
            font-size: 15px;
            font-weight: 600;
            text-align: right;
        }}
        .total-row .receipt-label {{
            font-size: 16px;
            color: #0f172a;
            font-weight: 700;
        }}
        .total-row .receipt-value {{
            font-size: 24px;
            color: #0d9488;
            font-weight: 700;
        }}
        .cta-button {{
            display: inline-block;
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
        }}
        .cta-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4);
        }}
        .help-section {{
            background: #fefce8;
            border-left: 4px solid #eab308;
            padding: 16px 20px;
            border-radius: 8px;
            margin: 24px 0;
        }}
        .help-section p {{
            color: #713f12;
            font-size: 14px;
            margin: 0;
        }}
        .footer {{
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }}
        .footer-text {{
            color: #64748b;
            font-size: 13px;
            margin-bottom: 8px;
        }}
        .footer-links {{
            margin-top: 16px;
        }}
        .footer-link {{
            color: #0d9488;
            text-decoration: none;
            margin: 0 12px;
            font-size: 13px;
            font-weight: 500;
        }}
        @media only screen and (max-width: 600px) {{
            .email-wrapper {{ margin: 0; border-radius: 0; }}
            .content {{ padding: 30px 20px; }}
            .header {{ padding: 30px 20px; }}
        }}
    </style>
</head>
<body>
    <div class="email-wrapper">
        <!-- Header -->
        <div class="header">
            <div class="logo">CareCredit QuickPayBot</div>
            <div class="tagline">Secure Payment Processing</div>
            <div class="success-badge">✓ Payment Successful</div>
        </div>
        
        <!-- Content -->
        <div class="content">
            <div class="greeting">Thank you for your payment!</div>
            <p class="message">
                Your payment has been successfully processed. Below are the details of your transaction for your records.
            </p>
            
            <!-- Receipt Card -->
            <div class="receipt-card">
                <table class="receipt-table" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td class="receipt-label" width="40%">Transaction ID</td>
                        <td class="receipt-value">{transaction_id}</td>
                    </tr>
                    <tr>
                        <td class="receipt-label">Date</td>
                        <td class="receipt-value">{date}</td>
                    </tr>
                    <tr>
                        <td class="receipt-label">Payment Method</td>
                        <td class="receipt-value">{payment_method}</td>
                    </tr>
                    <tr class="total-row">
                        <td class="receipt-label">Amount Paid</td>
                        <td class="receipt-value">${amount}</td>
                    </tr>
                </table>
            </div>
            
            <!-- CTA Button -->
            <center>
                <a href="#" class="cta-button">View Account Details</a>
            </center>
            
            <!-- Help Section -->
            <div class="help-section">
                <p><strong>Need help?</strong> If you have any questions about this payment, our support team is here to assist you 24/7.</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p class="footer-text">&copy; 2024 CareCredit QuickPayBot. All rights reserved.</p>
            <p class="footer-text">This is an automated receipt for your payment transaction.</p>
            <div class="footer-links">
                <a href="#" class="footer-link">Privacy Policy</a>
                <a href="#" class="footer-link">Terms of Service</a>
                <a href="#" class="footer-link">Contact Support</a>
            </div>
        </div>
    </div>
</body>
</html>
"""

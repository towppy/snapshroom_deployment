# services/email_service.py
from flask_mail import Message
from flask import current_app
import logging
from html import escape

logger = logging.getLogger(__name__)


def send_prediction_email(user_email, user_name, prediction_result):
    """
    Send prediction result email to user after mushroom analysis.
    
    Args:
        user_email: User's email address
        user_name: User's display name
        prediction_result: Dictionary containing prediction results
    
    Returns:
        Boolean indicating success/failure
    """
    try:
        if not user_email:
            logger.warning("No email provided for sending prediction")
            return False
            
        logger.info(f"Attempting to send prediction email to {user_email}")
        
        # Extract prediction data
        species_info = prediction_result.get('image_analysis', {}).get('species', {})
        toxicity_info = prediction_result.get('image_analysis', {}).get('toxicity', {})
        risk_assessment = prediction_result.get('risk_assessment', {})
        recommendations = prediction_result.get('recommendations', [])
        safety_actions = prediction_result.get('safety_actions', [])
        
        species_name = species_info.get('species_name', 'Unknown')
        edibility = toxicity_info.get('toxicity_status', 'Unknown')
        confidence = species_info.get('confidence', 0)
        risk_level = risk_assessment.get('overall_risk_level', 'Unknown')
        
        # Build HTML email content
        html_content = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }}
                    .section {{ background: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; }}
                    .result-box {{ background: white; border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                    .success {{ border-left-color: #4CAF50; }}
                    .warning {{ border-left-color: #ff9800; }}
                    .danger {{ border-left-color: #f44336; }}
                    .label {{ font-weight: bold; color: #667eea; }}
                    .value {{ margin-left: 10px; }}
                    ul {{ margin: 10px 0; padding-left: 20px; }}
                    li {{ margin: 5px 0; }}
                    .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🍄 SnapShroom Prediction Results</h1>
                    </div>
                    
                    <p>Hello {escape(user_name)},</p>
                    <p>Your mushroom analysis is complete! Here are the results:</p>
                    
                    <div class="section" style="background: white; border: 2px solid #667eea;">
                        <h2 style="color: #667eea; margin-top: 0;">📊 Analysis Results</h2>
                        
                        <div class="result-box">
                            <span class="label">Mushroom Species:</span>
                            <span class="value">{escape(species_name)}</span>
                        </div>
                        
                        <div class="result-box">
                            <span class="label">Confidence Level:</span>
                            <span class="value">{confidence:.1%}</span>
                        </div>
                        
                        <div class="result-box">
                            <span class="label">Edibility Status:</span>
                            <span class="value">{escape(edibility)}</span>
                        </div>
                        
                        <div class="result-box">
                            <span class="label">Overall Risk Level:</span>
                            <span class="value">{escape(risk_level)}</span>
                        </div>
                    </div>
                    
                    {'<div class="section warning"><h3>⚠️ Recommendations</h3><ul>' + ''.join(f'<li>{escape(rec)}</li>' for rec in recommendations) + '</ul></div>' if recommendations else ''}
                    
                    {'<div class="section danger"><h3>🚨 Safety Actions</h3><ul>' + ''.join(f'<li>{escape(action)}</li>' for action in safety_actions) + '</ul></div>' if safety_actions else ''}
                    
                    <div class="section" style="background: #e3f2fd; border-left-color: #2196F3;">
                        <h3 style="color: #2196F3; margin-top: 0;">ℹ️ Important Notice</h3>
                        <p>This analysis is provided for informational purposes only. Always consult with a professional mycologist before consuming any wild mushrooms. Never rely solely on automated identification for food safety decisions.</p>
                    </div>
                    
                    <div class="footer">
                        <p>© 2026 SnapShroom. All rights reserved.</p>
                        <p>This email was sent to {escape(user_email)} from our mushroom identification system.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        # Create and send email
        msg = Message(
            subject=f"🍄 Mushroom Identification: {species_name}",
            recipients=[user_email],
            html=html_content
        )
        
        # Send with Flask-Mail
        mail = current_app.extensions.get('mail')
        if mail:
            mail.send(msg)
            logger.info(f"Prediction email sent successfully to {user_email}")
            return True
        else:
            logger.error("Mail extension not initialized")
            return False
        
    except Exception as e:
        logger.error(f"Failed to send prediction email to {user_email}: {str(e)}")
        return False


def send_alert_email(user_email, user_name, alert_type, alert_message):
    """
    Send an alert email for high-risk predictions.
    
    Args:
        user_email: User's email address
        user_name: User's display name
        alert_type: Type of alert (e.g., 'toxic', 'rare', 'dangerous')
        alert_message: Detailed alert message
    
    Returns:
        Boolean indicating success/failure
    """
    try:
        html_content = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .alert-header {{ background: #f44336; color: white; padding: 20px; border-radius: 5px; text-align: center; }}
                    .alert-content {{ background: #ffebee; border: 2px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 5px; }}
                    .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="alert-header">
                        <h1>🚨 ALERT: High-Risk Mushroom Detection</h1>
                    </div>
                    
                    <p>Hello {escape(user_name)},</p>
                    
                    <div class="alert-content">
                        <h2 style="color: #f44336;">⚠️ Alert Type: {escape(alert_type).upper()}</h2>
                        <p>{escape(alert_message)}</p>
                    </div>
                    
                    <p style="color: #d32f2f; font-weight: bold;">
                        DO NOT consume this mushroom. Please seek professional advice before proceeding.
                    </p>
                    
                    <div class="footer">
                        <p>© 2026 SnapShroom. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        msg = Message(
            subject=f"🚨 ALERT: {alert_type.upper()} Mushroom Detected",
            recipients=[user_email],
            html=html_content
        )
        
        # Send with Flask-Mail
        mail = current_app.extensions.get('mail')
        if mail:
            mail.send(msg)
            logger.info(f"Alert email sent to {user_email}")
            return True
        else:
            logger.error("Mail extension not initialized")
            return False
        
    except Exception as e:
        logger.error(f"Failed to send alert email to {user_email}: {str(e)}")
        return False

#verify email (legacy – kept for compatibility)
def send_verification_email(user_email, user_name, token):
    """Send verification email to the user."""
    try:
        verification_link = f"{current_app.config['FRONTEND_URL']}/verify-email?token={token}"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height:1.5;">
                <h2>Hello {escape(user_name)},</h2>
                <p>Thank you for registering on SnapShroom!</p>
                <p>Please verify your email by clicking the link below:</p>
                <p><a href="{verification_link}" target="_blank">Verify Email</a></p>
                <p>This link expires in 24 hours.</p>
                <p>🍄 SnapShroom Team</p>
            </body>
        </html>
        """

        msg = Message(
            subject="Verify Your SnapShroom Email",
            recipients=[user_email],
            html=html_content
        )

        mail = current_app.extensions.get('mail')
        if mail:
            mail.send(msg)
            logger.info(f"Verification email sent to {user_email}")
            return True
        else:
            logger.error("Mail extension not initialized")
            return False

    except Exception as e:
        logger.error(f"Failed to send verification email to {user_email}: {str(e)}")
        return False


def send_account_deactivation_email(user_email, user_name, reason):
    """
    Notify a user that their account has been deactivated by an admin.

    Args:
        user_email: User's email address
        user_name:  User's display name
        reason:     Human-readable deactivation reason

    Returns:
        Boolean indicating success/failure
    """
    try:
        from html import escape as _esc
        SNAPSHROOM_EMAIL = "snapshroom.official@gmail.com"

        html_content = f"""
        <html>
          <head>
            <style>
              body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
              .wrap {{ max-width: 600px; margin: 0 auto; padding: 24px 16px; }}
              .header {{ background: linear-gradient(135deg, #8B0000 0%, #C94040 100%);
                         color: white; padding: 28px; border-radius: 8px 8px 0 0; text-align: center; }}
              .header h1 {{ margin: 0 0 6px 0; font-size: 22px; }}
              .header p  {{ margin: 0; font-size: 13px; opacity: 0.85; }}
              .body {{ background: #fafafa; border: 1px solid #eee; border-top: none;
                       padding: 28px; border-radius: 0 0 8px 8px; }}
              .reason-box {{ background: #fff3f3; border-left: 4px solid #C94040;
                             padding: 16px 20px; border-radius: 4px; margin: 20px 0; }}
              .reason-label {{ font-size: 12px; font-weight: bold; text-transform: uppercase;
                               color: #C94040; letter-spacing: 0.05em; margin-bottom: 6px; }}
              .reason-text  {{ font-size: 15px; color: #333; font-weight: 500; }}
              .contact-box  {{ background: #f0f4ff; border-left: 4px solid #3A6BC9;
                               padding: 14px 20px; border-radius: 4px; margin: 20px 0; font-size: 14px; }}
              .contact-box a {{ color: #3A6BC9; font-weight: bold; text-decoration: none; }}
              .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 24px; }}
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="header">
                <h1>🚫 Account Deactivated</h1>
                <p>SnapShroom · Account Notice</p>
              </div>
              <div class="body">
                <p>Hello <strong>{_esc(user_name)}</strong>,</p>
                <p>We are writing to inform you that your SnapShroom account has been <strong>deactivated</strong> by an administrator.</p>

                <div class="reason-box">
                  <div class="reason-label">Reason for Deactivation</div>
                  <div class="reason-text">{_esc(reason) if reason else "Not specified"}</div>
                </div>

                <p>While your account is deactivated, you will not be able to log in or use any features of SnapShroom.</p>

                <div class="contact-box">
                  <strong>Need help or want to appeal?</strong><br/>
                  Please reach out to our support team at:<br/>
                  <a href="mailto:{SNAPSHROOM_EMAIL}">{SNAPSHROOM_EMAIL}</a>
                </div>

                <p style="color:#888; font-size:13px;">If you believe this is a mistake, please contact us as soon as possible.</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 SnapShroom. All rights reserved.</p>
                <p>This notification was sent to {_esc(user_email)}.</p>
              </div>
            </div>
          </body>
        </html>
        """

        msg = Message(
            subject="Your SnapShroom Account Has Been Deactivated",
            recipients=[user_email],
            html=html_content
        )
        mail = current_app.extensions.get('mail')
        if mail:
            mail.send(msg)
            logger.info(f"Deactivation email sent to {user_email}")
            return True
        logger.error("Mail extension not initialized")
        return False
    except Exception as e:
        logger.error(f"Failed to send deactivation email to {user_email}: {str(e)}")
        return False


def send_account_activation_email(user_email, user_name):
    """
    Notify a user that their account has been reactivated by an admin.

    Args:
        user_email: User's email address
        user_name:  User's display name

    Returns:
        Boolean indicating success/failure
    """
    try:
        from html import escape as _esc
        SNAPSHROOM_EMAIL = "snapshroom.official@gmail.com"

        html_content = f"""
        <html>
          <head>
            <style>
              body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
              .wrap {{ max-width: 600px; margin: 0 auto; padding: 24px 16px; }}
              .header {{ background: linear-gradient(135deg, #1B5E20 0%, #3A8C5C 100%);
                         color: white; padding: 28px; border-radius: 8px 8px 0 0; text-align: center; }}
              .header h1 {{ margin: 0 0 6px 0; font-size: 22px; }}
              .header p  {{ margin: 0; font-size: 13px; opacity: 0.85; }}
              .body {{ background: #fafafa; border: 1px solid #eee; border-top: none;
                       padding: 28px; border-radius: 0 0 8px 8px; }}
              .info-box {{ background: #f0fff4; border-left: 4px solid #3A8C5C;
                           padding: 16px 20px; border-radius: 4px; margin: 20px 0; font-size: 14px; }}
              .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 24px; }}
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="header">
                <h1>✅ Account Reactivated</h1>
                <p>SnapShroom · Account Notice</p>
              </div>
              <div class="body">
                <p>Hello <strong>{_esc(user_name)}</strong>,</p>
                <p>Great news! Your SnapShroom account has been <strong>reactivated</strong> by an administrator.</p>

                <div class="info-box">
                  You can now log in and use all features of SnapShroom again.<br/>
                  Welcome back! 🍄
                </div>

                <p>If you have any questions, please contact us at <a href="mailto:{SNAPSHROOM_EMAIL}">{SNAPSHROOM_EMAIL}</a>.</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 SnapShroom. All rights reserved.</p>
                <p>This notification was sent to {_esc(user_email)}.</p>
              </div>
            </div>
          </body>
        </html>
        """

        msg = Message(
            subject="Your SnapShroom Account Has Been Reactivated",
            recipients=[user_email],
            html=html_content
        )
        mail = current_app.extensions.get('mail')
        if mail:
            mail.send(msg)
            logger.info(f"Activation email sent to {user_email}")
            return True
        logger.error("Mail extension not initialized")
        return False
    except Exception as e:
        logger.error(f"Failed to send activation email to {user_email}: {str(e)}")
        return False


def send_firebase_verification_email(user_email, user_name, verification_link):
    """Send a Firebase-generated email verification link to the user."""
    try:
        from html import escape as _escape
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height:1.5; color:#333;">
                <div style="max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;border-radius:5px;text-align:center;">
                        <h1>\U0001f344 Verify Your SnapShroom Email</h1>
                    </div>
                    <p>Hello {_escape(user_name)},</p>
                    <p>Thank you for registering on SnapShroom! Please verify your email address by clicking the button below:</p>
                    <div style="text-align:center;margin:30px 0;">
                        <a href="{verification_link}" target="_blank"
                           style="background:#667eea;color:white;padding:14px 28px;border-radius:5px;text-decoration:none;font-weight:bold;">
                            Verify Email Address
                        </a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break:break-all;color:#667eea;">{verification_link}</p>
                    <p style="color:#999;font-size:12px;">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
                    <div style="text-align:center;color:#999;font-size:12px;margin-top:20px;border-top:1px solid #ddd;padding-top:10px;">
                        <p>\u00a9 2026 SnapShroom. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """

        msg = Message(
            subject="Verify Your SnapShroom Email",
            recipients=[user_email],
            html=html_content
        )

        mail = current_app.extensions.get('mail')
        if mail:
            mail.send(msg)
            logger.info(f"Firebase verification email sent to {user_email}")
            return True
        else:
            logger.error("Mail extension not initialized")
            return False

    except Exception as e:
        logger.error(f"Failed to send Firebase verification email to {user_email}: {str(e)}")
        return False
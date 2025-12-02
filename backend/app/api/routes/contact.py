import resend
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr

from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings

router = APIRouter()
logger = get_logger(__name__)


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


@router.post("/contact", status_code=200)
@limiter.limit(settings.rate_limit_contact)
async def send_contact_email(request: Request, response: Response, form: ContactForm):
    """
    Send a contact email using Resend.
    """
    if not settings.resend_api_key:
        logger.error("Resend API key not configured")
        raise HTTPException(status_code=500, detail="Email service not configured")

    resend.api_key = settings.resend_api_key

    try:
        # Send email to support/admin
        resend.Emails.send(
            {
                "from": settings.resend_from_email,
                "to": "eliot.atlani01@gmail.com",
                "subject": f"Contact Form: {form.subject}",
                "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background-color: #f4f4f5;
                        margin: 0;
                        padding: 0;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        margin-top: 40px;
                        margin-bottom: 40px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        border: 1px solid rgba(0, 0, 0, 0.1);
                    }}
                    .header {{
                        background-color: #030213;
                        padding: 32px;
                        text-align: center;
                    }}
                    .header h1 {{
                        color: #ffffff;
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                        letter-spacing: -0.025em;
                    }}
                    .content {{
                        padding: 40px 32px;
                        color: #030213;
                        line-height: 1.6;
                    }}
                    .footer {{
                        padding: 32px;
                        text-align: center;
                        color: #717182;
                        font-size: 13px;
                        background-color: #f9fafb;
                        border-top: 1px solid #ececf0;
                    }}
                    h2 {{
                        color: #030213;
                        font-size: 20px;
                        font-weight: 600;
                        margin-top: 0;
                        margin-bottom: 24px;
                    }}
                    .field {{
                        margin-bottom: 20px;
                    }}
                    .label {{
                        font-size: 12px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: #717182;
                        margin-bottom: 8px;
                        display: block;
                    }}
                    .value {{
                        background-color: #f3f3f5;
                        padding: 16px;
                        border-radius: 8px;
                        font-size: 15px;
                        color: #030213;
                    }}
                    .message-value {{
                        background-color: #f3f3f5;
                        padding: 16px;
                        border-radius: 8px;
                        font-size: 15px;
                        color: #030213;
                        white-space: pre-wrap;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>NoteAI</h1>
                    </div>
                    <div class="content">
                        <h2>New Contact Form Submission 📬</h2>

                        <div class="field">
                            <span class="label">Name</span>
                            <div class="value">{form.name}</div>
                        </div>

                        <div class="field">
                            <span class="label">Email</span>
                            <div class="value">{form.email}</div>
                        </div>

                        <div class="field">
                            <span class="label">Subject</span>
                            <div class="value">{form.subject}</div>
                        </div>

                        <div class="field">
                            <span class="label">Message</span>
                            <div class="message-value">{form.message}</div>
                        </div>
                    </div>
                    <div class="footer">
                        <p>&copy; {settings.app_name or "NoteAI"}. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            }
        )

        return {"message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send email: {e!s}")
        raise HTTPException(status_code=500, detail="Failed to send email") from e

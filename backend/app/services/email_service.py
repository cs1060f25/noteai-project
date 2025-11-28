"""email service for sending transactional emails."""

import resend

from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)


class EmailService:
    """service for sending emails using resend."""

    def __init__(self) -> None:
        """initialize email service."""
        if settings.resend_api_key:
            resend.api_key = settings.resend_api_key
        else:
            logger.warning("RESEND_API_KEY not set. Email sending will be disabled.")

    def send_video_completed_email(self, to_email: str, video_title: str, video_url: str) -> None:
        """send video completion email to user.

        args:
            to_email: recipient email address
            video_title: title of the processed video
            video_url: link to view the video
        """
        if not settings.resend_api_key:
            logger.warning("Skipping email send: RESEND_API_KEY not set")
            return

        try:
            params = {
                "from": settings.resend_from_email,
                "to": [to_email],
                "subject": "Your video is ready! 🎬",
                "html": f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                    <style>
                        body {{
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                            background-color: #f4f4f5; /* Light gray background */
                            margin: 0;
                            padding: 0;
                        }}
                        .container {{
                            max-width: 600px;
                            margin: 0 auto;
                            background-color: #ffffff;
                            border-radius: 12px; /* Matches --radius */
                            overflow: hidden;
                            margin-top: 40px;
                            margin-bottom: 40px;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                            border: 1px solid rgba(0, 0, 0, 0.1); /* --border */
                        }}
                        .header {{
                            background-color: #030213; /* --primary */
                            padding: 32px;
                            text-align: center;
                        }}
                        .header h1 {{
                            color: #ffffff; /* --primary-foreground */
                            margin: 0;
                            font-size: 24px;
                            font-weight: 600;
                            letter-spacing: -0.025em;
                        }}
                        .content {{
                            padding: 40px 32px;
                            color: #030213; /* --foreground / --primary */
                            line-height: 1.6;
                        }}
                        .btn {{
                            display: inline-block;
                            background-color: #030213; /* --primary */
                            color: #ffffff; /* --primary-foreground */
                            padding: 14px 28px;
                            text-decoration: none;
                            border-radius: 8px; /* --radius */
                            font-weight: 500;
                            margin-top: 32px;
                            transition: opacity 0.2s;
                        }}
                        .btn:hover {{
                            opacity: 0.9;
                        }}
                        .footer {{
                            padding: 32px;
                            text-align: center;
                            color: #717182; /* --muted-foreground */
                            font-size: 13px;
                            background-color: #f9fafb;
                            border-top: 1px solid #ececf0; /* --muted */
                        }}
                        h2 {{
                            color: #030213; /* --primary */
                            font-size: 20px;
                            font-weight: 600;
                            margin-top: 0;
                            margin-bottom: 16px;
                        }}
                        p {{
                            margin-bottom: 16px;
                            color: #374151;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>NoteAI</h1>
                        </div>
                        <div class="content">
                            <h2>Your video is ready! 🎬</h2>
                            <p>Great news! Your video <strong>{video_title}</strong> has finished processing and is ready for viewing.</p>
                            <p>Our AI agents have successfully analyzed the content, generated transcripts, and created highlight clips just for you.</p>
                            <div style="text-align: center;">
                                <a href="{video_url}" class="btn">View Video Dashboard</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>&copy; {settings.app_name or "NoteAI"}. All rights reserved.</p>
                            <p>If you didn't request this, please ignore this email.</p>
                        </div>
                    </div>
                </body>
                </html>
                """,
            }

            email = resend.Emails.send(params)
            logger.info(
                "Email sent successfully",
                extra={"to_email": to_email, "email_id": email.get("id")},
            )

        except Exception as e:
            logger.error(
                "Failed to send email",
                exc_info=e,
                extra={"to_email": to_email},
            )
            # do not raise exception to prevent job failure

    def send_podcast_completed_email(
        self, to_email: str, video_title: str, podcast_url: str
    ) -> None:
        """send podcast completion email to user.

        args:
            to_email: recipient email address
            video_title: title of the source video
            podcast_url: link to listen to the podcast
        """
        if not settings.resend_api_key:
            logger.warning("Skipping email send: RESEND_API_KEY not set")
            return

        try:
            params = {
                "from": settings.resend_from_email,
                "to": [to_email],
                "subject": "Your AI Podcast is ready! 🎙️",
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
                            background-color: #7c3aed; /* Purple for podcast */
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
                        .btn {{
                            display: inline-block;
                            background-color: #7c3aed;
                            color: #ffffff;
                            padding: 14px 28px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 500;
                            margin-top: 32px;
                            transition: opacity 0.2s;
                        }}
                        .btn:hover {{
                            opacity: 0.9;
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
                            color: #7c3aed;
                            font-size: 20px;
                            font-weight: 600;
                            margin-top: 0;
                            margin-bottom: 16px;
                        }}
                        p {{
                            margin-bottom: 16px;
                            color: #374151;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>NoteAI</h1>
                        </div>
                        <div class="content">
                            <h2>Your AI Podcast is ready! 🎙️</h2>
                            <p>We've finished generating an audio podcast for <strong>{video_title}</strong>.</p>
                            <p>Listen to the key concepts explained in an engaging dialogue format, perfect for learning on the go.</p>
                            <div style="text-align: center;">
                                <a href="{podcast_url}" class="btn">Listen to Podcast</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>&copy; {settings.app_name or "NoteAI"}. All rights reserved.</p>
                            <p>If you didn't request this, please ignore this email.</p>
                        </div>
                    </div>
                </body>
                </html>
                """,
            }

            email = resend.Emails.send(params)
            logger.info(
                "Podcast completion email sent successfully",
                extra={"to_email": to_email, "email_id": email.get("id")},
            )

        except Exception as e:
            logger.error(
                "Failed to send podcast completion email",
                exc_info=e,
                extra={"to_email": to_email},
            )

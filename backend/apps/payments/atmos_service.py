import uuid
import requests
import base64
import logging
from django.conf import settings
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)


class AtmosService:
    """
    ATMOS Payment Gateway service.

    Handles authentication and checkout invoice creation.
    Uses the checkout/invoice/create endpoint which returns a hosted payment URL.
    """

    def __init__(self):
        self.config = settings.ATMOS_CONFIG
        self.base_url = self.config['BASE_URL'].rstrip('/')
        self.store_id = self.config['STORE_ID']
        self.consumer_key = self.config['CONSUMER_KEY']
        self.consumer_secret = self.config['CONSUMER_SECRET']

    def get_access_token(self):
        """Obtain a Bearer token from ATMOS using client credentials."""
        url = f"{self.base_url}/token"
        auth_str = f"{self.consumer_key}:{self.consumer_secret}"
        base64_auth = base64.b64encode(auth_str.encode()).decode()

        headers = {
            "Authorization": f"Basic {base64_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"grant_type": "client_credentials"}

        try:
            response = requests.post(url, data=data, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json().get("access_token")
        except Exception as e:
            logger.error(f"ATMOS Token Error: {str(e)}")
            raise APIException("ATMOS authorization error")

    def create_checkout_invoice(self, transaction_id, amount_in_tiyin, item_name, success_url):
        """
        Create a checkout invoice on ATMOS and return payment URL.

        Args:
            transaction_id: Internal PaymentTransaction ID (used as account identifier)
            amount_in_tiyin: Payment amount in tiyin (1 UZS = 100 tiyin)
            item_name: Description of what the user is purchasing
            success_url: URL to redirect user after successful payment

        Returns:
            dict with 'payment_id' and 'payment_url'
        """
        access_token = self.get_access_token()
        url = f"{self.base_url}/checkout/invoice/create"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "request_id": str(uuid.uuid4())[:10],
            "store_id": int(self.store_id),
            "amount": int(amount_in_tiyin),
            "account": str(transaction_id),
            "success_url": success_url,
            "items": [
                {
                    "items_id": str(transaction_id),
                    "name": item_name,
                    "price": int(amount_in_tiyin),
                    "quantity": 1,
                    "amount": int(amount_in_tiyin),
                    "details": {
                        "name": "EdTrack AI",
                        "values": item_name,
                    },
                }
            ],
        }

        try:
            logger.info(f"ATMOS Payload: {payload}")
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            data = response.json()

            if str(data.get("status", {}).get("code")) == "0":
                return {
                    "payment_id": data.get("payment_id"),
                    "payment_url": data.get("url"),
                }
            else:
                desc = data.get("status", {}).get("description", "System error")
                logger.error(f"ATMOS Response Error: {data}")
                raise APIException(f"ATMOS Error: {desc}")
        except APIException:
            raise
        except Exception as e:
            logger.error(f"ATMOS Invoice Error: {str(e)}")
            raise APIException(f"Payment creation error: {str(e)}")

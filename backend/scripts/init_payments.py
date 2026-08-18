from apps.payments.models import CreditPricing, ExchangeRate, CreditBonusRule

def run():
    # 1. Base Pricing
    CreditPricing.objects.get_or_create(defaults={'price_per_credit_usd': 1.0000})
    
    # 2. Base Exchange Rate
    ExchangeRate.objects.get_or_create(defaults={'usd_to_uzs': 12800.00})
    
    # 3. Sample Bonus Rules
    CreditBonusRule.objects.get_or_create(min_credits=100, defaults={'bonus_credits': 10})
    CreditBonusRule.objects.get_or_create(min_credits=500, defaults={'bonus_credits': 75})
    
    print("Initialization complete! Check Django Admin to customize.")

if __name__ == "__main__":
    run()

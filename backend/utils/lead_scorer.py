import re

def calculate_lead_score(lead_data: dict) -> dict:
    """
    Intelligently calculate a lead's temperature based on keywords and patterns
    in their form submission.
    """
    score = 0
    
    # Extract fields safely (convert to standard lower/strips)
    def clean(val):
        return str(val).lower().strip() if val else ""

    deadline = clean(lead_data.get("task_deadline"))
    budget = clean(lead_data.get("budget"))
    size = clean(lead_data.get("company_size"))
    role = clean(lead_data.get("role"))
    
    # 1. Evaluate Deadline (Max +30)
    if "срочн" in deadline or "горит" in deadline or "сейчас" in deadline or "критич" in deadline:
        score += 30
    elif "недел" in deadline or "2 нед" in deadline:
        score += 20
    elif "месяц" in deadline:
        score += 15
    elif "полгода" in deadline:
        score += 5
    elif "смотр" in deadline or "просто" in deadline:
        score -= 10
        
    # 2. Evaluate Budget (Max +30)
    if "высок" in budget or "миллион" in budget or "млн" in budget or "> 1" in budget or "одобрен" in budget:
        score += 30
    elif "средн" in budget or "500" in budget:
        score += 15
    elif "инвест" in budget or "грант" in budget or "нет" in budget or "бесплатн" in budget:
        score -= 20
    elif "низк" in budget or "минимал" in budget:
        score += 5
        
    # 3. Evaluate Company Size (Max +20)
    if ">500" in size or "более 500" in size or "1000" in size:
        score += 20
    elif "100-500" in size or "100" in size:
        score += 15
    elif "50-100" in size or "50" in size:
        score += 10
    elif "10-50" in size:
        score += 5
        
    # 4. Evaluate Role (Max +20)
    if "owner" in role or "директор" in role or "владелец" in role or "ceo" in role:
        score += 20
    elif "manager" in role or "руководитель" in role:
        score += 15
    elif "employee" in role or "специалист" in role:
        score += 5
        
    # Determine Final Temperature and recommendation
    if score >= 65:
        temperature = "🔥 Горячий"
        priority = "high"
        recommendations = "VIP Лид. Свяжитесь немедленно. Назначить на Senior менеджера."
    elif score >= 35:
        temperature = "☀️ Теплый"
        priority = "medium"
        recommendations = "Стандартный Лид. Назначить Sales-отделу для квалификации."
    else:
        temperature = "❄️ Холодный"
        priority = "low"
        recommendations = "Низкий приоритет. Запустить авто-рассылку презентаций."
        
    return {
        "score": max(0, score),  # prevent negative
        "temperature": temperature,
        "priority_level": priority,
        "recommendation": recommendations
    }

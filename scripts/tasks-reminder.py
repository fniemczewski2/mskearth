import os
import time
import datetime
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from collections import defaultdict

# --- KONFIGURACJA ---
SLACK_BOT_TOKEN = "xoxb-TWOJ-TOKEN-TUTAJ"
LIST_ID = "F0C3DRXSY3V" 
LIST_URL = "WKLEJ_TUTAJ_PELNY_LINK_DO_LISTY" 

client = WebClient(token=SLACK_BOT_TOKEN)

def extract_text(element):
    if isinstance(element, dict):
        if "text" in element and isinstance(element["text"], str):
            return element["text"]
        for key in ["elements", "rich_text"]:
            if key in element:
                return "".join(extract_text(e) for e in element[key])
    elif isinstance(element, list):
        return "".join(extract_text(e) for e in element)
    return ""

def get_list_items(list_id):
    try:
        response = client.api_call(
            "slackLists.items.list",
            json={"list_id": list_id, "include_list": False}
        )
        return response.data
    except SlackApiError as e:
        print(f"Błąd pobierania Listy: {e}")
        return None

def parse_list_data(data):
    tasks_by_user = defaultdict(list)
    
    title_col = "Col0C3L05VDNE"
    assignee_col = "Col0C3N1K7Y9X"
    status_col = "Col0C3DSGF4UB"
    
    open_status_values = ["OptHLOTJ6CC", "OptNYET7N6L", "OptHERGQPA4"] 

    records = data.get("items", [])
    
    for rec in records:
        fields = rec.get("fields", [])
        
        is_open = False
        task_name = "Zadanie bez nazwy"
        assignees = []
        
        for field in fields:
            col_id = field.get("column_id")
            
            if col_id == status_col:
                selected_options = field.get("select", [])
                if selected_options and selected_options[0] in open_status_values:
                    is_open = True
                    
            elif col_id == assignee_col:
                assignees = field.get("user", [])
                
            elif col_id == title_col:
                task_name = field.get("text") or extract_text(field.get("rich_text", [])) or "Zadanie bez nazwy"
                
        if is_open and assignees:
            for user_id in assignees:
                tasks_by_user[user_id].append(task_name)
                
    return tasks_by_user

def send_reminders(tasks_by_user):
    for user_id, tasks in tasks_by_user.items():
        main_message = f"Cześć! 👋 Przypominam, że masz otwarte zadania na naszej liście (<{LIST_URL}|kliknij tutaj, aby przejść do Listy>). Ich szczegóły znajdziesz w wątku tej wiadomości 👇"

        try:
            response = client.chat_postMessage(channel=user_id, text=main_message)
            thread_ts = response['ts']
            
            thread_message = "Twoje bieżące zadania (Do zrobienia, W trakcie lub Zawieszone):\n\n"
            for task in tasks:
                thread_message += f"• {task}\n"
            
            client.chat_postMessage(channel=user_id, text=thread_message, thread_ts=thread_ts)
            print(f"✅ Wysłano przypomnienie do {user_id} (Zadań: {len(tasks)})")
            
        except SlackApiError as e:
            print(f"❌ Błąd wysyłki do {user_id}: {e}")

if __name__ == "__main__":
    while True:
        print(f"[{datetime.datetime.now()}] Uruchamiam sprawdzanie Slack List...")
        list_data = get_list_items(LIST_ID)
        
        if list_data:
            pending_tasks = parse_list_data(list_data)
            if pending_tasks:
                send_reminders(pending_tasks)
            else:
                print("Brak otwartych zadań dla przypisanych użytkowników.")
        else:
            print("Nie udało się pobrać danych z Listy.")
            
        print(f"[{datetime.datetime.now()}] Zasypiam na dwa tygodnie (1 209 600 sekund)...")
        time.sleep(1209600)
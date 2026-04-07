import json
import os

def show_json_data():
    files = ['users.json', 'devices.json', 'threat_logs.json']

    for file in files:
        if os.path.exists(file):
            print(f"\n=== {file.upper().replace('.JSON', ' DATA')} ===")
            try:
                with open(file, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        for key, value in data.items():
                            print(f"{key}: {value}")
                    elif isinstance(data, list):
                        for item in data:
                            print(item)
                    else:
                        print(data)
            except Exception as e:
                print(f"Error reading {file}: {e}")
        else:
            print(f"\n=== {file.upper().replace('.JSON', ' DATA')} ===")
            print(f"File {file} not found.")

if __name__ == '__main__':
    show_json_data()

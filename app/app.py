from flask import Flask, send_from_directory, jsonify, request, abort, send_file, Response,render_template
from flask_cors import CORS
import os
import random

app = Flask(__name__, static_folder="../app/static", static_url_path="/static")
CORS(app)  # 允许所有来源的跨域请求

AVAILABLE_FOLDERS = {
    "dian_gun": "./music/溜冰场",
    "da_si_ma": "./music/大司马",
    "ding_zhen":"./music/丁真",
    "dxl":"./music/东洋雪莲",
    "ha_ji_mi":"./music/哈基米"
}
current_folder_key = "dian_gun"

def get_current_music_folder():
    return AVAILABLE_FOLDERS[current_folder_key]


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/songs')
def get_songs():
    folder = get_current_music_folder()
    songs = [f for f in os.listdir(folder) if f.lower().endswith('.mp3')]
    return jsonify(songs)

@app.route('/api/set-folder', methods=['POST'])
def set_folder():
    global current_folder_key
    data = request.get_json()
    folder = data.get('folder')
    if folder in AVAILABLE_FOLDERS:
        current_folder_key = folder
        return jsonify({"status": "ok", "current": folder})
    return jsonify({"error": "Invalid folder key"}), 400


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

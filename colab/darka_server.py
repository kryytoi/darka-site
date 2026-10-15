# Сервер моделей Darka для Google Colab: FastAPI + туннель trycloudflare.
# Запускайте отдельной ячейкой ПОСЛЕ ячейки, где загружены tok (токенизатор) и model.
# Рядом должен лежать скачанный ./cloudflared.
#
# Повторный запуск ячейки безопасен: прежний сервер останавливается, а туннель продолжает работать,
# поэтому адрес не меняется и в админке ничего править не нужно. Новый адрес появляется только
# после перезапуска среды Colab — тогда вставьте его в админку и нажмите «Сохранить».
import gc, re, socket, subprocess, threading, time, traceback

import requests, torch, uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse

BASE_SYSTEM = "Ты — Darka, полезный помощник. Отвечай по-русски."
MAX_NEW_TOKENS = 512
MAX_TIME = 45  # секунд на генерацию: сайт ждёт ответ не дольше 55 секунд
PORT = 8000

app = FastAPI()
gpu_lock = threading.Lock()


@app.get("/")
def health():
    # Откройте адрес в браузере: {"status": "ok"} значит, что туннель и сервер работают
    return {"status": "ok", "busy": gpu_lock.locked()}


def build_messages(raw):
    system, chat = [BASE_SYSTEM], []
    for m in raw:
        role, content = m.get("role"), str(m.get("content") or "").strip()
        if not content:
            continue
        if role == "system":
            system.append(content)  # главный промпт пользователя и режим «Рассуждение» с сайта
        elif role in ("user", "assistant"):
            if chat and chat[-1]["role"] == role:
                chat[-1]["content"] += "\n\n" + content  # строгие шаблоны требуют чередования ролей
            else:
                chat.append({"role": role, "content": content})
    while chat and chat[0]["role"] != "user":
        chat.pop(0)
    return [{"role": "system", "content": "\n\n".join(system)}] + chat


@app.post("/")
def chat(body: dict):
    started = time.time()
    try:
        messages = build_messages(body.get("messages", []))
        prompt = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tok(prompt, return_tensors="pt", add_special_tokens=False).to(model.device)
        with gpu_lock:  # одна генерация за раз, остальные запросы ждут очереди
            budget = MAX_TIME - (time.time() - started)
            if budget < 5:
                return JSONResponse(status_code=503, content={"error": "Модель занята другим запросом"})
            out = model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS, max_time=budget,
                                 do_sample=True, temperature=0.7, top_p=0.9)
        reply = tok.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
        print(f"[darka] ответ за {time.time() - started:.1f} с")
        return {"choices": [{"message": {"role": "assistant", "content": reply}}]}
    except Exception as e:
        traceback.print_exc()
        torch.cuda.empty_cache()
        # Текст ошибки увидит администратор сайта в чате и в кнопке «Проверить»
        return JSONResponse(status_code=500, content={"error": f"{type(e).__name__}: {e}"})


def port_busy():
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", PORT)) == 0


# Сервер из прошлого запуска ячейки держит порт: просим его остановиться
for obj in gc.get_objects():
    if isinstance(obj, uvicorn.Server):
        obj.should_exit = True
for _ in range(600):
    if not port_busy():
        break
    time.sleep(0.1)

server = uvicorn.Server(uvicorn.Config(app, host="0.0.0.0", port=PORT))
server_thread = threading.Thread(target=server.run, daemon=True)
server_thread.start()
while not server.started and server_thread.is_alive():
    time.sleep(0.1)
if not server.started:
    raise RuntimeError(f"Сервер не запустился: порт {PORT} занят. Среда выполнения → Перезапустить сеанс, затем запустите ячейки заново.")


def drain(pipe):
    for _ in pipe:
        pass


# Туннель Cloudflare. Если он уже запущен, адрес остаётся прежним.
if "p" in globals() and p.poll() is None:
    print("Туннель уже работает, адрес прежний:", globals().get("URL") or "тот, что сохранён в админке")
else:
    URL = None
    p = subprocess.Popen(["./cloudflared", "tunnel", "--url", f"http://localhost:{PORT}"],
                         stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in p.stdout:
        found = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
        if found:
            URL = found.group(0)
            break
    print("НОВЫЙ URL:", URL, "— вставьте его в админку сайта и нажмите «Сохранить»")
# cloudflared продолжает писать лог. Если его не читать, буфер переполнится и туннель зависнет.
if not getattr(p, "drained", False):
    p.drained = True
    threading.Thread(target=drain, args=(p.stdout,), daemon=True).start()

# Самопроверка: тот же запрос, что отправляет сайт
t = time.time()
r = requests.post(f"http://localhost:{PORT}/", timeout=120, json={
    "model": "shadow", "stream": False,
    "messages": [{"role": "user", "content": "Привет! Ответь одним предложением."}],
})
print(f"Самопроверка: HTTP {r.status_code} за {time.time() - t:.1f} с →", r.text[:300])

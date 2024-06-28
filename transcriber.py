import sys
import whisper

def transcribe(audio_path):
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    return result["text"]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcriber.py <audio_file_path>")
    else:
        audio_file_path = sys.argv[1]
        text = transcribe(audio_file_path)
        print(text)
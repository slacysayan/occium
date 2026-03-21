import yt_dlp
import sys

def test_fetch():
    url = "https://www.youtube.com/watch?v=jNQXAC9IVRw" # Me at the zoo
    ydl_opts = {
        'quiet': False,
        'extract_flat': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            print(f"Title: {info.get('title')}")
            print("Success")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_fetch()

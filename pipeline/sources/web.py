import requests
from bs4 import BeautifulSoup


def fetch_web_text(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent": "RNReadyBot/1.0"})
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)

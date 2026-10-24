with open("public/index.html", "r") as f:
    html = f.read()

config_code = """const configuration = { 
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "relay.metered.ca:80", username: "e0a6d51d382404ffc20202e8", credential: "P1c+844E3696f/2D" },
        { urls: "turn:relay.metered.ca:80?transport=tcp", username: "e0a6d51d382404ffc20202e8", credential: "P1c+844E3696f/2D" },
        { urls: "turn:relay.metered.ca:443", username: "e0a6d51d382404ffc20202e8", credential: "P1c+844E3696f/2D" }
    ] 
};"""

import re
html = re.sub(r'const configuration = \{[\s\S]*?\};', config_code, html)

with open("public/index.html", "w") as f:
    f.write(html)

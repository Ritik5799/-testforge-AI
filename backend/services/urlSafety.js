import dns from "node:dns/promises";
import net from "node:net";

function urlError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function isPrivateAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19))
      || (a === 203 && b === 0);
  }

  if (version !== 6) return true;
  const normalized = address.toLowerCase().split("%")[0];
  const [left, right = ""] = normalized.split("::");
  const leftParts = left ? left.split(":") : [];
  const rightParts = right ? right.split(":") : [];
  const parts = [...leftParts, ...Array(Math.max(0, 8 - leftParts.length - rightParts.length)).fill("0"), ...rightParts];

  if (parts.some((part) => part.includes("."))) {
    const octets = parts.pop().split(".").map(Number);
    parts.push(((octets[0] << 8) | octets[1]).toString(16), ((octets[2] << 8) | octets[3]).toString(16));
  }

  const words = parts.map((part) => parseInt(part || "0", 16));
  const first = words[0];
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) {
    const mapped = `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`;
    return isPrivateAddress(mapped);
  }
  if ((first & 0xe000) !== 0x2000) return true;
  return first === 0x2001 && (words[1] <= 0x01ff || words[1] === 0x0db8)
    || first === 0x2002;
}

export async function assertPublicHttpUrl(input, resolutionCache) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw urlError("Enter a valid public website URL starting with http:// or https://.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw urlError("Only public HTTP or HTTPS website URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname || hostname === "localhost" || /\.(local|localhost|internal|test|invalid|example)$/.test(hostname)) {
    throw urlError("Private, local, and example hosts cannot be tested.");
  }

  if (net.isIP(hostname)) {
    throw urlError("Enter a public website hostname rather than an IP address.");
  }

  let addressLookup = resolutionCache?.get(hostname);
  if (!addressLookup) {
    let timer;
    addressLookup = Promise.race([
      dns.lookup(hostname, { all: true, verbatim: true }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("DNS lookup timed out."), { code: "ETIMEOUT" })), 5000);
        timer.unref();
      })
    ]).finally(() => clearTimeout(timer));
    resolutionCache?.set(hostname, addressLookup);
  }
  let addresses;
  try {
    addresses = await addressLookup;
  } catch (error) {
    if (error.code === "ENOTFOUND" || error.code === "ENODATA") {
      throw urlError("The website hostname could not be resolved. Check the URL.");
    }
    throw urlError("Could not check the website hostname. Try again.", 503);
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw urlError("The website must resolve only to public IP addresses.");
  }
  return url.href;
}

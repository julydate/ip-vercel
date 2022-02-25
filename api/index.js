const path = require("path");
const axios = require("axios");
const iconv = require("iconv-lite");

module.exports = (req, res) => {
  // 设置请求头允许跨域
  const headersIndex = req.rawHeaders.indexOf("Access-Control-Request-Headers");
  const requestHeaders =
    headersIndex === -1 ? "*" : req.rawHeaders[headersIndex + 1];
  res.setHeader("Access-Control-Allow-Headers", requestHeaders);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Content-Type", "application/json");
  res.status(200);

  // 获取并校验 IP
  const ip = req.query.ip;
  const type = req.query.type;
  let ipType = "null";
  if (!ip) {
    let data = {
      code: 404,
      data: "allow query: ip=xxx(ipv4|ipv6)&type=local(default)|remote|all",
    };
    res.status(404).json(data);
    return;
  }
  if (ipv4(ip)) {
    ipType = "ipv4";
  } else if (ipv6(ip)) {
    ipType = "ipv6";
  } else {
    let data = {
      code: 403,
      data: "IP not valid",
    };
    res.status(403).json(data);
    return;
  }

  // 整合查询到的 IP 信息
  let data = {
    code: 0,
    data: {},
  };

  // 根据 IP 类型调用接口
  switch (ipType) {
    case "ipv4":
      switch (type) {
        // 查询全部数据库
        case "all":
          data.data.qqwry = qqwry(ip);
          data.data.ipipfree = ipipfree(ip);
          data.data.ipip = ipip(ip);
          axios
            .all([ipinfo(ip), ipsb(ip), ip138(ip)])
            .then(
              axios.spread((...responses) => {
                data.data.ipinfo = responses[0];
                data.data.ipsb = responses[1];
                data.data.ip138 = responses[2];
                res.json(data);
              })
            )
            .catch((error) => {
              console.log(error);
              res.json(data);
            });
          break;
        // 查询 API 接口
        case "remote":
          axios
            .all([ipinfo(ip), ipsb(ip), ip138(ip)])
            .then(
              axios.spread((...responses) => {
                data.data.ipinfo = responses[0];
                data.data.ipsb = responses[1];
                data.data.ip138 = responses[2];
                res.json(data);
              })
            )
            .catch((error) => {
              console.log(error);
              res.json(data);
            });
          break;
        // 查询本地接口（默认）
        default:
        case "local":
          data.data.qqwry = qqwry(ip);
          data.data.ipipfree = ipipfree(ip);
          data.data.ipip = ipip(ip);
          res.json(data);
          break;
      }
      break;
    case "ipv6":
      switch (type) {
        // 查询全部数据库
        case "all":
          data.data.ipv6wry = ipv6wry(ip);
          axios
            .all([ipinfo(ip), ipsb(ip)])
            .then(
              axios.spread((...responses) => {
                data.data.ipinfo = responses[0];
                data.data.ipsb = responses[1];
                res.json(data);
              })
            )
            .catch((error) => {
              console.log(error);
              res.json(data);
            });
          break;
        // 查询 API 接口
        case "remote":
          axios
            .all([ipinfo(ip), ipsb(ip)])
            .then(
              axios.spread((...responses) => {
                data.data.ipinfo = responses[0];
                data.data.ipsb = responses[1];
                res.json(data);
              })
            )
            .catch((error) => {
              console.log(error);
              res.json(data);
            });
          break;
        // 查询本地接口（默认）
        default:
        case "local":
          data.data.ipv6wry = ipv6wry(ip);
          res.json(data);
          break;
      }
      break;
    default:
    case "null":
      data.data = "IP not valid";
      data.code = 403;
      res.status(403).json(data);
      break;
  }

  return;
};

// 封装函数

// 纯真 IP 库查询函数
export function qqwry(ip) {
  // 引用纯真 IP 库
  const libqqwry = require("lib-qqwry");
  const qqwrydb = new libqqwry(true, path.join(__dirname, "../data/qqwry.dat"));

  // 使用纯真 IP 库查询 IP
  const qqwry = qqwrydb.searchIP(ip);
  return qqwry;
}

// zxinc IPv6 库查询函数
export function ipv6wry(ip) {
  // 引用 IPv6 库
  /* 原代码报错，已修改并提交 pull request
  这里暂时使用本地代码
  参见：https://github.com/julydate/zxinc-ipv6 */
  // const daidrzxinc = require("zxinc-ipv6");
  const daidrzxinc = require("../zxinc-ipv6");
  const ipv6wrydb = new daidrzxinc(path.join(__dirname, "../data/ipv6wry.db"));

  // 使用 IPv6 库查询 IP
  let ipv6wry = ipv6wrydb.getIPAddr(ip);
  return ipv6wry;
}

// IPIP 免费库查询函数
export function ipipfree(ip) {
  // 引用 IPIP 免费库
  const ipdb = require("ipdb");
  const ipfreedb = new ipdb(path.join(__dirname, "../data/ipipfree.ipdb"));

  // 使用 IPIP 免费库查询 IP
  let ipipfree = ipfreedb.find(ip);
  return ipipfree;
}

// IPIP 付费库查询函数
export function ipip(ip) {
  // 引用 IPIP 付费库
  const ipdb = require("ipdb");
  const ipipdb = new ipdb(
    path.join(__dirname, "../data/mydata4vipday2_cn.20200405.ipdb")
  );

  // 使用 IPIP 付费库查询 IP
  let ipip = ipipdb.find(ip);
  return ipip;
}

// IP138 查询函数
async function ip138(ip) {
  let data = {
    code: 500,
  };
  await axios
    .get("https://www.ip138.com/iplookup.asp?ip=" + ip + "&action=2", {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
        Referer: "https://www.ip138.com/",
      },
    })
    .then(function (res) {
      if (res.status == 200) {
        // 将 gb2312 编码转化为 utf-8
        const str = iconv.decode(Buffer.from(res.data), "gb2312");
        const html = iconv.encode(str, "utf8").toString();
        // 正则提取网页中 IP 信息
        const re = new RegExp("ip_result.*=.*({.*({.*})+.*});", "i");
        const result = re.exec(html);
        if (result) {
          data.data = JSON.parse(result[1]);
          data.code = 0;
        } else {
          // IP138 会禁止查询一些 IP，并进行重定向
          data.data = "禁止查询该 IP";
          data.code = 403;
        }
      } else {
        // 请求出错
        data.code = res.status;
      }
    })
    .catch(function (error) {
      console.log(error);
      data.data = error.message;
      data.code = 502;
    });
  return data;
}

// IPInfo 查询函数
async function ipinfo(ip) {
  let data = {
    code: 500,
  };
  await axios
    .get("https://ipinfo.io/" + ip + "/json")
    .then(function (res) {
      if (res.status == 200) {
        data.data = res.data;
        data.code = 0;
      } else {
        // 请求出错
        data.code = res.status;
      }
    })
    .catch(function (error) {
      console.log(error);
      data.data = error.message;
      data.code = 502;
    });
  return data;
}

// IP.SB 查询函数
async function ipsb(ip) {
  let data = {
    code: 500,
  };
  await axios
    .get("https://api.ip.sb/geoip/" + ip)
    .then(function (res) {
      if (res.status == 200) {
        data.data = res.data;
        data.code = 0;
      } else {
        // 请求出错
        data.code = res.status;
      }
    })
    .catch(function (error) {
      console.log(error);
      data.data = error.message;
      data.code = 502;
    });
  return data;
}

// 正则校验 IPv4
export function ipv4(IP) {
  const ipv4 =
    /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  return ipv4.test(IP);
}

// 正则校验 IPv6
export function ipv6(ip) {
  const ipv6 =
    /^([\da-fA-F]{1,4}:){6}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^::([\da-fA-F]{1,4}:){0,4}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:):([\da-fA-F]{1,4}:){0,3}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){2}:([\da-fA-F]{1,4}:){0,2}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){3}:([\da-fA-F]{1,4}:){0,1}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){4}:((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$|^:((:[\da-fA-F]{1,4}){1,6}|:)$|^[\da-fA-F]{1,4}:((:[\da-fA-F]{1,4}){1,5}|:)$|^([\da-fA-F]{1,4}:){2}((:[\da-fA-F]{1,4}){1,4}|:)$|^([\da-fA-F]{1,4}:){3}((:[\da-fA-F]{1,4}){1,3}|:)$|^([\da-fA-F]{1,4}:){4}((:[\da-fA-F]{1,4}){1,2}|:)$|^([\da-fA-F]{1,4}:){5}:([\da-fA-F]{1,4})?$|^([\da-fA-F]{1,4}:){6}:$/;
  return ipv6.test(ip);
}

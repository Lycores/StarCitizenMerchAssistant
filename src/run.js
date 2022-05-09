var fs = require("fs");
var { parse } = require("csv-parse");

let exportPathCSV = "../ccuList.csv";
let exportPathTXT = "../ccuList.txt";
let resultStr = "";

let p1 = new Promise((resolve, reject) => {
  let list = [];
  let file = fs
    .createReadStream("../file.csv")
    .pipe(parse({ columns: true, delimiter: ",", relax_quotes: true }));
  file.on("error", () => {
    reject("there is an error");
  });
  file.on("data", (data) => {
    list.push(data);
  });
  file.on("end", () => {
    resolve(list);
  });
});

p1.then((obj) => {
  return obj;
}).catch((error) => {
  console.log(error);
});

let p2 = new Promise((resolve, reject) => {
  let list = [];
  let file = fs
    .createReadStream("../translate_sheet.csv")
    .pipe(parse({ columns: true, delimiter: ",", relax_quotes: true }));
  file.on("error", () => {
    reject("there is an error");
  });
  file.on("data", (data) => {
    list.push(data);
  });
  file.on("end", () => {
    resolve(list);
  });
});

p2.then((obj) => {
  return obj;
}).catch((error) => {
  console.log(error);
});

let p3 = new Promise((resolve, reject) => {
  let list = [];
  let file = fs
    .createReadStream("../exemption.csv")
    .pipe(parse({ columns: true, delimiter: ",", relax_quotes: true }));
  file.on("error", () => {
    reject("there is an error");
  });
  file.on("data", (data) => {
    list.push(data);
  });
  file.on("end", () => {
    resolve(list);
  });
});

p3.then((obj) => {
  return obj;
}).catch((error) => {
  console.log(error);
});

Promise.all([p1, p2, p3]).then((values) => {
  let ccuObj = values[0];
  let transObj = values[1];
  let exemptionObj = values[2];
  // console.log(ccuObj);
  let temp_result_1 = [];
  ccuObj.forEach((ccu) => {
    let fromInTarLang = "";
    let toInTarLang = "";
    let fromInOrigLang = "";
    let toInOrigLang = "";
    transObj.forEach((trans) => {
      if (ccu.from.trim().toUpperCase() == trans.From.trim().toUpperCase()) {
        fromInTarLang = trans.To.trim();
        fromInOrigLang = ccu.from.trim();
      }
      if (ccu.to.trim().toUpperCase() == trans.From.trim().toUpperCase()) {
        toInTarLang = trans.To;
        toInOrigLang = ccu.to.trim();
      }
    });
    if (fromInTarLang == "" || toInTarLang == "") {
      console.error(
        `A ccu name doesn't have matches on translate_sheet.csv, please check the names of ccu: ${ccu.from} -> ${ccu.to}`
      );
    } else {
      let CCUPrice = ccu["pledge.amount"];
      let isGiftableCount = ccu.isGiftableCount;
      let isBuyBack = ccu.isBuyback;
      let count = ccu.count;
      if (isGiftableCount > 0 || isBuyBack) {
        temp_result_1.push({
          fromInTarLang,
          toInTarLang,
          fromInOrigLang,
          toInOrigLang,
          value: parseInt(CCUPrice),
          count: parseInt(count),
        });
      }
    }
  });

  let temp_result_2 = [];
  temp_result_1.forEach((resultEntry) => {
    let result = resultEntry;
    exemptionObj.forEach((exemption) => {
      if (
        (exemption.From.trim().toUpperCase() ==
          resultEntry.fromInTarLang.trim().toUpperCase() ||
          exemption.From.trim().toUpperCase() ==
            resultEntry.fromInOrigLang.trim().toUpperCase()) &&
        (exemption.To.trim().toUpperCase() ==
          resultEntry.toInTarLang.trim().toUpperCase() ||
          exemption.To.trim().toUpperCase() ==
            resultEntry.toInOrigLang.trim().toUpperCase())
      ) {
        if (exemption.Count == "" && exemption.NotForSale != "T") {
          console.error(
            `the exepmtion file need to give either waived count or mark NotForSale as T, ${exemption.From} to ${exemption.To} does not satisy this`
          );
        } else {
          if (
            exemption.NotForSale == "T" ||
            parseInt(exemption.Count) >= parseInt(resultEntry.count)
          ) {
            result = null;
          } else {
            result = {
              ...resultEntry,
              count: parseInt(resultEntry.count) - parseInt(exemption.Count),
            };
          }
        }
      }
    });

    if (result) {
      temp_result_2.push(result);
    }
  });

  // console.log(temp_result_2);
  let temp_result_3 = {};
  // console.log(Object.keys(temp_result_3));
  temp_result_2.forEach((record) => {
    if (Object.keys(temp_result_3).includes(record.value.toString())) {
      temp_result_3[record.value.toString()].push(record);
    } else {
      temp_result_3[record.value.toString()] = [];
      temp_result_3[record.value.toString()].push(record);
    }
  });
  // console.log(temp_result_3);

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  let csvWriter = null;
  csvWriter = createCsvWriter({
    path: exportPathCSV,
    header: [
      { id: "fromInTarLang", title: "From" },
      { id: "toInTarLang", title: "To" },
      { id: "value", title: "MeltValue" },
      { id: "count", title: "Count" },
    ],
  });
  csvWriter
    .writeRecords([]) // returns a promise
    .then(() => {
      console.log("...Done");
    });

  csvWriter = createCsvWriter({
    path: exportPathCSV,
    header: [
      { id: "fromInTarLang", title: "From" },
      { id: "toInTarLang", title: "To" },
      { id: "value", title: "MeltValue" },
      { id: "count", title: "Count" },
    ],
    append: true,
  });

  for (keys in temp_result_3) {
    console.log(keys);

    csvWriter
      .writeRecords(temp_result_3[keys]) // returns a promise
      .then(() => {
        console.log("...Done");
      });
  }
  for (keys in temp_result_3) {
    resultStr += keys.toString() + "\n";
    resultStr += `小卖部库存 ${keys.toString()}美金 CCU 升级包，喜欢直接拍下\n！千刀发货，安全保障！\n礼物发送，虚拟商品一旦发送概不退换！欢迎关注我！\n以下是库存：\n`;
    temp_result_3[keys].forEach((item) => {
      resultStr +=
        item.fromInTarLang +
        " -> " +
        item.toInTarLang +
        " 库存 " +
        item.count +
        "\n";
    });
  }

  fs.writeFile(exportPathTXT, resultStr, (err) => {
    if (err) {
      console.error(err);
    }
    // file written successfully
  });
});

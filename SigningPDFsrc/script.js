const { ipcRenderer } = require('electron');
const fs = require("fs");
const drivelist = require('drivelist');
const { PDFDocument } = require('pdf-lib');


document.getElementById('pin-form').addEventListener('click', pinEnter);
document.getElementById('choose-file-btn').addEventListener('click', chooseFile);
document.getElementById('sign-btn').addEventListener('click', signPdf);
setInterval(checkForUSBDevices, 5000);


let privateKeyPath = undefined;
let outputPath = undefined; 
let filePath = undefined; 


async function checkForUSBDevices() {
    const drives = await drivelist.list();
    const usbDrives = drives.filter(drive => drive.busType === 'USB');

    let pdhtml = "";
    for(let i=0;i<usbDrives.length;i++){
      pdhtml+="<option>";
      pdhtml+=usbDrives[i].mountpoints[0].path;
      pdhtml+="</option>";
    }
    document.getElementById("pendrives").innerHTML = pdhtml; 
    
    if (usbDrives.length > 0) {
      document.getElementById("pendrives").removeAttribute("disabled");
      console.log("Znaleziono pendrive:", usbDrives[0].mountpoints[0].path);

      privateKeyPath = usbDrives[0].mountpoints[0].path + "/rsa_private_key.pem";
      outputPath = usbDrives[0].mountpoints[0].path + "/output.pdf";


      
      // if (fs.existsSync(privateKeyPath)) {
      //     console.log("Znaleziono klucz prywatny, podpisuję PDF...");
      //     // await signPdf("C:\\Users\\damia\\Downloads\\ENG_SCS_2025_project_v1.pdf", "./output.pdf", privateKeyPath, certPath);
      // } else {
      //     console.log("Nie znaleziono klucza na pendrive.");
      // }

    } else {
        console.log("Brak pendrive'ów.");
        return [];
    }
}


async function chooseFile() {
  const filePaths = await ipcRenderer.invoke('dialog:openFile');
  const wrapper = document.getElementById('wrapper');
  wrapper.innerHTML = ' \
  <section style="width: 20vw; overflow-y: auto; margin-left: 0;"> \
    <canvas id="pdf-canvas"></canvas> \
    <p id="file-path" style="word-wrap: break-word;"></p> \
  </section>';


  if (filePaths.length > 0) {
    document.getElementById('file-path').textContent = `Wybrany plik: ${filePaths[0]}`;
    loadPDF(filePaths[0]);
    filePath = filePaths[0];
  } else {
    document.getElementById('file-path').textContent = 'Nie wybrano żadnego pliku';
    wrapper.innerHTML = "";
  }
  async function loadPDF(filePath) {
    const loadingTask = pdfjsLib.getDocument(filePath);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.getElementById('pdf-canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
  }
}


async function pinEnter() {
  const pin = document.getElementById('pin');
  const pinv = pin.value;
  
  alert(`PIN: ${pinv}`)
  if (pinv === "1234") {
    alert("PIN poprawny!");
  } else {
    console.log()
    alert("Niepoprawny PIN.");
  }
}


// async function preparePdfForSigning(pdfPath, outputPath) {
//   const existingPdfBytes = fs.readFileSync(pdfPath);
//   const pdfDoc = await PDFDocument.load(existingPdfBytes);
//   const pages = pdfDoc.getPages();
//   const firstPage = pages[0];
//   const pdfdoc = new pdfDoc();
//   pdfdoc.addSignature({
//       name: 'Signature1',
//       reason: 'Document approval',
//       page: 0, 
//       x: 50,
//       y: 50,
//       width: 200,
//       height: 50,
//   });
//   const pdfBytes = await pdfoc.save();
//   fs.writeFileSync(outputPath, pdfBytes);
  
//   console.log("PDF przygotowany do podpisu!");
// }

async function signPdf() {
  if(privateKeyPath === undefined || outputPath === undefined || filePath === undefined) {
    alert("Nie znaleziono pendrive'a lub klucza prywatnego!");
    return;
  }



  
  fs.writeFileSync(outputPath, newPdfBytes);
  console.log("PDF podpisany pomyślnie!");
}
const { ipcRenderer } = require('electron');

document.getElementById('pin-form').addEventListener('click', (e) => {
  const pin = document.getElementById('pin');
  const pinv = pin.value;
  
  alert(`PIN: ${pinv}`)
  if (pinv === "1234") {
    alert("PIN poprawny!");
  } else {
    console.log()
    alert("Niepoprawny PIN.");
  }
});

document.getElementById('choose-file-btn').addEventListener('click', async () => {
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
});




//monitorowanie
// import fs from 'fs';
const fs = require("fs");
const drivelist = require('drivelist');
setInterval(async () => {
    await checkForUSBDevices();
}, 5000);
async function checkForUSBDevices() {
    const drives = await drivelist.list();
    const usbDrives = drives.filter(drive => drive.busType === 'USB');

    let pdhtml = "";
    for(let i=0;i<usbDrives.length;i++){
      pdhtml+="<option>";
      pdhtml+=usbDrives[i].mountpoints[0].path;
      // pdhtml+="->";
      // pdhtml+=usbDrives[i].description;
      pdhtml+="</option>";
    }
    document.getElementById("pendrives").innerHTML = pdhtml; 
    
    if (usbDrives.length > 0) {
      document.getElementById("pendrives").removeAttribute("disabled");
      console.log("Znaleziono pendrive:", usbDrives[0].mountpoints[0].path);

      const privateKeyPath = usbDrives[0].mountpoints[0].path + "/rsa_private_key.pem";
      const certPath = usbDrives[0].mountpoints[0].path + "/certificate.pem";
      
      if (fs.existsSync(privateKeyPath)) {
          console.log("Znaleziono klucz prywatny, podpisuję PDF...");

          await signPdf("C:\\Users\\damia\\Downloads\\ENG_SCS_2025_project_v1.pdf", "./output.pdf", privateKeyPath, certPath);
          // await signPDF("C:\\Users\\damia\\Downloads\\ENG_SCS_2025_project_v1.pdf", certPath, privateKeyPath, "./signed.pdf");
      } else {
          console.log("Nie znaleziono klucza na pendrive.");
      }

    } else {
        console.log("Brak pendrive'ów.");
        return [];
    }
}

const { SignPdf } = require('node-signpdf');
const { PDFDocument } = require('pdf-lib');

async function preparePdfForSigning(pdfPath, outputPath) {
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const pdfdoc = new pdfDoc();
  pdfdoc.addSignature({
      name: 'Signature1',
      reason: 'Document approval',
      page: 0, 
      x: 50,
      y: 50,
      width: 200,
      height: 50,
  });
  const pdfBytes = await pdfoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  
  console.log("PDF przygotowany do podpisu!");
}

async function signPdf(inputPath, outputPath, pkPath, certPath) {
  const privateKey = fs.readFileSync(pkPath, 'utf8');
  const certBuffer = fs.readFileSync(certPath);
  await preparePdfForSigning(inputPath, outputPath);
  const pdfBuffer = fs.readFileSync(outputPath);
  
  const signPdfInstance = new SignPdf(); // Utworzenie instancji klasy
  const signedPdf = signPdfInstance.sign(pdfBuffer, certBuffer);
  // const signedPdfBuffer = sign(pdfBuffer, privateKey);
  fs.writeFileSync(outputPath, signPdf);
  console.log('PDF został podpisany!');
}
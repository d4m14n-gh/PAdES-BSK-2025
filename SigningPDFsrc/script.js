document.getElementById('choose-file-btn').addEventListener('click', async () => {
  // Wywołanie głównego procesu, aby otworzyć okno wyboru pliku
  const filePaths = await ipcRenderer.invoke('dialog:openFile');
  
  if (filePaths.length > 0) {
    document.getElementById('file-path').textContent = `Wybrany plik: ${filePaths[0]}`;
    loadPDF(filePaths[0]);
  } else {
    document.getElementById('file-path').textContent = 'Nie wybrano żadnego pliku';
  }
  async function loadPDF(filePath) {
    const loadingTask = pdfjsLib.getDocument(filePath);
    const pdf = await loadingTask.promise;

    // Ładuj pierwszą stronę PDF
    const page = await pdf.getPage(1);

    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // Przygotowanie elementu canvas
    const canvas = document.getElementById('pdf-canvas');
    // canvas.style.height = "300px";
    const context = canvas.getContext('2d');
    
    // Ustawienia rozmiaru canvas
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Rysowanie strony na canvas
    await page.render({ canvasContext: context, viewport }).promise;
  }
});

// const usb = require('usb');

// // Wykrywanie urządzeń USB
// const devices = usb.getDeviceList();
// devices.forEach(device => {
//     console.log(device);
// });

// usb.on('attach', (device) => {
//   console.log('Urządzenie zostało podłączone:', device);
// });
// usb.on('detach', (device) => {
//   console.log('Urządzenie zostało odłączone:', device);
// });

//monitorowanie

const drivelist = require('drivelist');

async function checkForUSBDevices() {
    const drives = await drivelist.list();
    const usbDrives = drives.filter(drive => drive.busType === 'USB');
    
    if (usbDrives.length > 0) {
      console.log("Znaleziono pendrive:", usbDrives[0].mountpoints[0].path);

      const privateKeyPath = usbDrives[0].mountpoints[0].path + "/rsa_private_key.pem";
      
      if (fs.existsSync(privateKeyPath)) {
          console.log("Znaleziono klucz prywatny, podpisuję PDF...");

          await signPDF("C:\\Users\\damia\\Downloads\\ENG_SCS_2025_project_v1.pdf", "signed.pdf", privateKeyPath);
      } else {
          console.log("Nie znaleziono klucza na pendrive.");
      }

    } else {
        console.log("Brak pendrive'ów.");
        return [];
    }
}

const { SignPdf } = require('@signpdf/signpdf');
// const { SignerPKCS7 } = require('@signpdf/signpdf');
const fs = require('fs');


const signer = require('@signpdf/signpdf').default;
const SignerPKCS7 = require('@signpdf/signpdf').SignerPKCS7;

async function signPDF(inputPath, outputPath, privateKeyPath) {
  const pdfBuffer = fs.readFileSync(inputPath);
  const privateKey = fs.readFileSync(privateKeyPath);

  const signedPdf = await signer.sign(pdfBuffer, new SignerPKCS7(privateKey));

  fs.writeFileSync(outputPath, signedPdf);
  console.log("Podpisano PDF:", outputPath);
}


// Sprawdzanie co 5 sekund
setInterval(async () => {
    await checkForUSBDevices();
}, 5000);


// document.getElementById('pin-form').addEventListener('submit', (e) => {
//     // e.preventDefault();
//     console.log("x");
//     const pin = document.getElementById('pin');
//     pin.value = "";

//     alert(`PIN: ${pinv}`)
//     if (pinv === "1234") { // Załóżmy, że poprawny PIN to 1234
//         alert("PIN poprawny!");
//     } else {
//         alert("Niepoprawny PIN.");
//     }
// });
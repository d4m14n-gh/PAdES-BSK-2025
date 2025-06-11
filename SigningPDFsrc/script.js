const { ipcRenderer } = require('electron');
const fs = require("fs");
const drivelist = require('drivelist');

document.getElementById('action-select').addEventListener('change', changeMode);
document.getElementById('choose-file-btn').addEventListener('click', chooseFile);
document.getElementById('choose-output-file-btn').addEventListener('click', chooseOutputFile);
document.getElementById('choose-private-key-file-btn').addEventListener('click', choosePrivateKeyFile);
document.getElementById('choose-public-key-file-btn').addEventListener('click', choosePublicKeyFile);
document.getElementById('sign-btn').addEventListener('click', signPdf);
document.getElementById('verify-btn').addEventListener('click', verifyPdf);


let filePath = undefined; 


checkForUSBDevices();
setInterval(checkForUSBDevices, 2500);
async function checkForUSBDevices() {
  const drives = await drivelist.list();
  const usbDrives = drives.filter(drive => drive.busType === 'USB');

  let pdhtml = "";
  for(let i=0;i<usbDrives.length;i++){
    const mount = usbDrives[i].mountpoints[0].path;
    pdhtml+=`<option value='${mount}'>`;
    pdhtml+=mount;
    pdhtml+="</option>";
  }

  const oldValue = document.getElementById("pendrives").value;
  document.getElementById("pendrives").innerHTML = pdhtml; 
  if(oldValue) {
    try{
      document.getElementById("pendrives").value = oldValue;
    } catch (e) {}
  }
  
  if (usbDrives.length > 0) {
    const mount = document.getElementById("pendrives").value;
    document.getElementById("pendrives").removeAttribute("disabled");
    console.log("Found USB drive:", mount);

    if ( document.getElementById("private-key-path").value === "" ) {
      const privateKeyPath = mount + ".prvt.pem";
      document.getElementById("private-key-path").value = privateKeyPath;
    }
    if ( document.getElementById("public-key-path").value === "" ) {
      const publicKeyPath = mount + ".pub.pem";
      document.getElementById("public-key-path").value = publicKeyPath;
    }

  } else {
    document.getElementById("pendrives").setAttribute("disabled");
    console.log("No USB drives found.");
    return [];
  }
}

async function chooseFile() {
  const filePaths = await ipcRenderer.invoke('dialog:openFile', [{ name: 'PDF Files', extensions: ['pdf'] }]);
  const wrapper = document.getElementById('wrapper');
  wrapper.innerHTML = ' \
  <div style="width: 20vw; overflow-y: auto; margin-left: 0; border: 1px solid rgba(255, 255, 255, 0.1); padding: 10px; border-radius: 10px;"> \
  <canvas id="pdf-canvas"></canvas> \
  <p id="file-path" style="word-wrap: break-word;"></p> \
  </div>';

  if (filePaths.length > 0) {
    document.getElementById('file-path').textContent = `${filePaths[0]}`;
    loadPDF(filePaths[0]);
    filePath = filePaths[0];
  } else {
    document.getElementById('file-path').textContent = 'No file selected';
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

// async function pinEnter() {
//   const pin = document.getElementById('pin');
//   const pinv = pin.value;
  
//   alert(`PIN: ${pinv}`)
//   if (pinv === "1234") {
//   alert("PIN correct!");
//   } else {
//   console.log()
//   alert("Incorrect PIN.");
//   }
// }


// crypto
function decryptWithAES(encryptedData, aesKey) {
    if (!aesKey || aesKey.length !== 32) { 
        throw new Error('Invalid AES key. Expected a 256-bit key.');
    }
    const decipher = crypto.createDecipheriv('aes-256-ecb', aesKey, null);
    decipher.setAutoPadding(true);
    try {
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        console.log('Decrypted data:', decrypted.toString('utf8')); // Debug: Logs the decrypted data as a string
        return decrypted.toString('utf8'); // Return decrypted data as a UTF-8 string
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
}

function hashPIN(pin) {
    console.log('hashPIN called with:', pin);
    if (!pin || typeof pin !== 'string') {
        throw new Error('Invalid PIN. Expected a non-empty string.');
    }
    return crypto.createHash('sha256').update(pin, 'utf8').digest();
}

// new code

function isFileExisting(path) {
  return fs.existsSync(path);
}

async function signPdf() {
  const privateKeyPath = document.getElementById('private-key-path').value;
  const outputFilePath = document.getElementById('output-file-path').value;
  if(outputFilePath === undefined) {
    alert("No output file selected!");
    return;
  }
  if(privateKeyPath === "") {
    alert("No private key file selected!");
    return;
  }
  if (filePath === undefined) {
    alert("No PDF file selected!"); 
    return;
  }
  if (!isFileExisting(privateKeyPath)) {
    alert("Private key file does not exist at the specified path!");
    return;
  }
  if (!isFileExisting(filePath)) {
    alert("PDF file does not exist at the specified path!");
    return;
  }
  if (isFileExisting(outputFilePath)) {
    const overwrite = confirm("Output file already exists. Do you want to overwrite it?");
    if (!overwrite) {
      return;
    }
  }
  await ipcRenderer.invoke('sign', filePath, outputFilePath, privateKeyPath);
  alert("PDF signed!");
}

async function verifyPdf() {
  const publicKeyPath = document.getElementById('public-key-path').value;
  if (filePath === undefined) {
    alert("No PDF file selected for verification!");
    return;
  }
  if (publicKeyPath === "") {
    alert("No public key file selected for verification!");
    return;
  }
  if (!isFileExisting(publicKeyPath)) {
    alert("Public key file does not exist at the specified path!");
    return;
  }
  if (!isFileExisting(filePath)) {
    alert("PDF file does not exist at the specified path!");
    return;
  }
  try {
    let response = await ipcRenderer.invoke('verify', filePath, publicKeyPath);
    alert(`Verification successful!`);
  }
  catch (error) {
    alert("Verification failed!");
  }
}

async function chooseOutputFile() {
  const filePath = await ipcRenderer.invoke('dialog:save-file');
  if (filePath) {
    const outputFilePath = filePath;
    document.getElementById('output-file-path').value = outputFilePath;
  } else {
    document.getElementById('output-file-path').value = '';
  }
}

async function choosePrivateKeyFile() {
  const filePath = await ipcRenderer.invoke('dialog:openFile', [{ name: 'Private Key Files', extensions: ['pem'] }]);
  console.log("Private key file path:", filePath);
  if (filePath) {
    const privateKeyPath = filePath;
    document.getElementById('private-key-path').value = privateKeyPath;
  } else {
    document.getElementById('private-key-path').value = '';
  }
}

async function choosePublicKeyFile() {
  const filePath = await ipcRenderer.invoke('dialog:openFile', [{ name: 'Public Key Files', extensions: ['pem'] }]);
  console.log("Public key file path:", filePath);
  if (filePath) {
    const publicKeyPath = filePath;
    document.getElementById('public-key-path').value = publicKeyPath;
  } else {
    document.getElementById('public-key-path').value = '';
  }
}

async function changeMode() {
  const selectedValue = document.getElementById('action-select').value;
  const signTab = document.getElementById('sign-tab');
  const verifyTab = document.getElementById('verify-tab');

  if (selectedValue === "sign") {
    signTab.style.display = "block";
    verifyTab.style.display = "none";
  } else if (selectedValue === "verify") {
    signTab.style.display = "none";
    verifyTab.style.display = "block";
  }
}

async function resetFocus() {
  setTimeout(() => {
    document.getElementById("my-input").focus();
  }, 0);
}
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
    canvas.style.height = "fit-content";
    const context = canvas.getContext('2d');
    
    // Ustawienia rozmiaru canvas
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Rysowanie strony na canvas
    await page.render({ canvasContext: context, viewport }).promise;
  }
});

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
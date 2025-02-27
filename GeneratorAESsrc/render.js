window.electronAPI.getDrives().then((drives) => {
    const driveSelect = document.getElementById('drive-select');
    drives.forEach((drive) => {
        const option = document.createElement('option');
        option.value = drive;
        option.textContent = drive;
        driveSelect.appendChild(option);
    });
});

document.getElementById('generate-button').addEventListener('click', () => {
    const driveSelect = document.getElementById('drive-select');
    const selectedDrive = driveSelect.value;
    const status = document.getElementById('status');
    const pinForm = document.getElementById('pin-form');

    if (!selectedDrive) {
        status.textContent = 'Please select a drive!';
        return;
    }

    status.textContent = '';
    pinForm.style.display = 'block';

    pinForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const pinInput = document.getElementById('pin');
        const userPIN = pinInput.value;

        console.log(userPIN);
        console.log('Type of userPIN:', typeof userPIN);

        if (!userPIN || userPIN.length !== 4) {
            status.textContent = 'PIN must be 4 digits!';
            return;
        }

        pinForm.style.display = 'none'; 
        status.textContent = 'Generating keys...';

        window.electronAPI.generateKeys(selectedDrive, userPIN).then((paths) => {
            status.textContent = `Keys generated successfully!
            Public Key: ${paths.publicKeyPath}
            Private Key: ${paths.privateKeyPath}`;
        }).catch((error) => {
            status.textContent = `Error generating keys: ${error.message}`;
        });
    }, { once: true });
});


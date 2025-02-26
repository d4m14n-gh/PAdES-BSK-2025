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

    if (!selectedDrive) {
        status.textContent = 'Please select a drive!';
        return;
    }

    status.textContent = 'Generating keys...';

    // Generowanie kluczy RSA na wybranym dysku
    window.electronAPI.generateKeys(selectedDrive).then((paths) => {
        status.textContent = `Keys generated successfully!
        Public Key: ${paths.publicKeyPath}
        Private Key: ${paths.privateKeyPath}`;
    }).catch((error) => {
        status.textContent = `Error generating keys: ${error.message}`;
    });
});


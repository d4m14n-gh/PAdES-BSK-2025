window.electronAPI.getDrives().then((drives) => {
    const driveSelect = document.getElementById('drive-select');
    drives.forEach((drive) => {
        const option = document.createElement('option');
        option.value = drive;
        option.textContent = drive;
        driveSelect.appendChild(option);
    });
});

document.getElementById('confirm-button').addEventListener('click', () => {
    const driveSelect = document.getElementById('drive-select');
    const selectedDrive = driveSelect.value;

    if (selectedDrive) {
        document.getElementById('selected-drive').textContent = `You selected: ${selectedDrive}`;
    } else {
        document.getElementById('selected-drive').textContent = 'Please select a drive!';
    }
});
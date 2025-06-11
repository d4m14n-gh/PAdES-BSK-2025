import shutil
import hashlib
import argparse
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from typing import Optional

import pypdf
from pypdf.generic import DictionaryObject, NameObject, ByteStringObject, create_string_object

"""
Adds a signature placeholder to a PDF file.

This function reads an input PDF file, creates a new PDF with a placeholder 
for a digital signature, and writes the modified content to an output PDF file.

@param input_pdf_path: Path to the input PDF file.
                       Must be a valid path to a readable PDF file.
@param output_pdf_path: Path where the modified PDF file with the signature 
                        placeholder will be saved.
@param signature_length: The length of the signature placeholder in bytes.
                         Determines the size of the placeholder.

@returns None

@raises FileNotFoundError: If the input PDF file cannot be found or opened.
@raises IOError: If the output PDF file cannot be written to the specified path.
@raises Exception: If any error occurs during PDF processing.

@example
# Usage example for the create_pdf_placeholder function:
input_pdf_path = "example_input.pdf"
output_pdf_path = "example_output_with_placeholder.pdf"
signature_length = 4096

try:
    create_pdf_placeholder(input_pdf_path, output_pdf_path, signature_length)
    print(f"Signature placeholder added successfully to {output_pdf_path}")
except Exception as e:
    print(f"An error occurred: {e}")
"""
def create_pdf_placeholder(input_pdf_path: str, output_pdf_path: str, signature_length: int) -> None:
    with open(input_pdf_path, 'rb') as input_file, open(output_pdf_path, 'wb') as output_file:
        reader = pypdf.PdfReader(input_file)
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        # Tworzymy obiekt podpisu /Sig — BEZ formularzy, bez Annots
        sig_dict = DictionaryObject()
        sig_dict.update({
            NameObject("/Type"): NameObject("/BskSignature"),
            NameObject("/Contents"): create_string_object("0"*signature_length), #ByteStringObject( random.randbytes(signature_length // 8) ), # rsa 4096
        })
        writer._add_object(sig_dict)
        with open(output_pdf_path, "wb") as f_out:
            writer.write(f_out)
"""
Replaces a sequence of bytes at a specified offset in a binary file.

This function modifies a binary file by replacing a sequence of bytes at a given offset 
with a new sequence of bytes. The modified content can be saved to a new file or 
overwrite the original file.

@param file_path: Path to the input binary file. Must be a valid and readable file path.
@param offset: The position (in bytes) where the replacement should begin. Must be within 
               the file's length and not exceed the file's boundaries.
@param new_bytes: The new sequence of bytes to replace at the specified offset.
                  Must be a `bytes` object.
@param output_path: Path to save the modified file. If `None`, the original file is overwritten.
                   (Default is None.)

@returns None

@raises ValueError: If the offset is invalid (negative, too large, or causes an overflow).
@raises FileNotFoundError: If the input file cannot be found or opened.
@raises IOError: If the output file cannot be written to the specified path.

@example
# Replace bytes in a file and save the result to a new file:
file_path = "example_file.bin"
offset = 100
new_bytes = b'\xAA\xBB\xCC\xDD'
output_path = "modified_file.bin"

try:
    replace_bytes_at_offset(file_path, offset, new_bytes, output_path)
    print(f"Bytes replaced successfully. Modified file saved at {output_path}")
except Exception as e:
    print(f"An error occurred: {e}")
"""
def replace_bytes_at_offset(file_path: str, offset: int, new_bytes: bytes, output_path: str = None) -> None:
    with open(file_path, 'rb') as f:
        content = bytearray(f.read())
    if offset < 0 or offset + len(new_bytes) > len(content):
        raise ValueError("Wrong offset.")
    content[offset:offset + len(new_bytes)] = new_bytes
    if output_path is None:
        output_path = file_path
    with open(output_path, 'wb') as f:
        f.write(content)
"""
Finds the position of a signature placeholder in a PDF file.

This function searches for a specific pattern in a PDF file indicating the start of 
a signature placeholder. If the placeholder is found, the position of the signature 
content is returned. Otherwise, it returns `None`.

@param pdf_path: The path to the PDF file to be searched. Must be a valid path to a readable file.

@returns Optional[int]: The position (byte offset) of the signature content if the placeholder is found, 
                        or `None` if the placeholder is not found.

@raises FileNotFoundError: If the specified PDF file cannot be found or opened.
@raises IOError: If an error occurs while reading the file.

@example
# Example usage of find_signature:
pdf_path = "example_with_placeholder.pdf"

try:
    signature_position = find_signature(pdf_path)
    if signature_position is not None:
        print(f"Signature placeholder found at byte offset: {signature_position}")
    else:
        print("No signature placeholder found in the PDF.")
except Exception as e:
    print(f"An error occurred: {e}")
"""
def find_signature(pdf_path: str) -> Optional[int]:
    with open(pdf_path, "rb") as f:
        pattern = b"/Type /BskSignature\n/Contents ("
        position = f.read().find(pattern)
        
        if position != -1:
            position+=len(pattern)
            print(f"Placeholder: {position}")
            return position
        else:
            print("Placeholder not found.")
    return None
"""
Extracts the signature data from a PDF file at a specified position.

This function reads a specified number of bytes starting from a given position 
in a PDF file and decodes it into a string representing the signature data.

@param pdf_path: The path to the PDF file. Must be a valid path to a readable PDF file.
@param position: The byte offset where the signature data begins. Must be a valid position within the file.
@param signature_length: The number of bytes to read for the signature data.

@returns str: The decoded signature data as a string.

@raises FileNotFoundError: If the specified PDF file cannot be found or opened.
@raises ValueError: If the position or signature length is invalid.
@raises UnicodeDecodeError: If the read bytes cannot be decoded into a string.

@example
# Example usage of get_signature:
pdf_path = "example_with_placeholder.pdf"
position = 1500  # Position of the signature in the file
signature_length = 256  # Length of the signature in bytes

try:
    signature = get_signature(pdf_path, position, signature_length)
    print(f"Extracted signature: {signature}")
except Exception as e:
    print(f"An error occurred: {e}")
"""
def get_signature(pdf_path: str, position: int, signature_length: int) -> str:
    with open(pdf_path, "rb") as f:
        f.seek(position)
        signature_data = f.read(signature_length)
        return signature_data.decode()
          
"""
Calculates the SHA-256 hash of a file excluding a specific section.

This function computes the SHA-256 hash of a file, omitting a specified section 
defined by its starting position and length. It reads the file in two parts: 
before and after the excluded section, and concatenates the remaining data to 
calculate the hash.

@param file_path: The path to the file to hash. Must be a valid path to a readable file.
@param start_position: The byte offset where the excluded section begins. Must be within the file's length.
@param length_of_section: The number of bytes to exclude from the hash computation.

@returns str: The computed SHA-256 hash as a hexadecimal string.

@raises FileNotFoundError: If the specified file cannot be found or opened.
@raises ValueError: If the start position or section length is invalid.
@raises IOError: If an error occurs while reading the file.

@example
# Example usage of calculate_sha256:
file_path = "example_file.bin"
start_position = 100
length_of_section = 50

try:
    hash_value = calculate_sha256(file_path, start_position, length_of_section)
    print(f"SHA-256 hash excluding section: {hash_value}")
except Exception as e:
    print(f"An error occurred: {e}")
"""
def calculate_sha256(file_path: str, start_position: int, length_of_section: int) -> str:
    with open(file_path, "rb") as file:
        file.seek(0)
        data_before = file.read(start_position)
        file.seek(start_position + length_of_section)
        data_after = file.read()
        remaining_data = data_before + data_after
        sha256_hash = hashlib.sha256()
        sha256_hash.update(remaining_data)
        return sha256_hash.hexdigest()
"""
Signs a hash value using a private key.

This function takes a hash value and a private key, and generates a signature for the hash 
using the RSA private key. The signature is returned as a hexadecimal string.

@param hash_value: The hash value to sign, represented as a hexadecimal string.
@param private_key_path: Path to the private key file in PEM format. 
                         The file must be accessible and contain a valid RSA private key.

@returns str: The generated signature as a hexadecimal string.

@raises FileNotFoundError: If the private key file cannot be found or opened.
@raises ValueError: If the hash value is invalid or the private key is not in the correct format.
@raises Exception: If signing the hash fails due to any other reason.

@example
# Example usage of sign_hash_with_private_key:
hash_value = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
private_key_path = "private_key.pem"

try:
    signature = sign_hash_with_private_key(hash_value, private_key_path)
    print(f"Generated signature: {signature}")
except Exception as e:
    print(f"An error occurred: {e}")
"""
def sign_hash_with_private_key(hash_value: str, private_key_path: str) -> str:
    with open(private_key_path, 'rb') as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )
    signature = private_key.sign(
        bytes.fromhex(hash_value),
        padding.PKCS1v15(),
        hashes.SHA256() 
    )
   
    return signature.hex()

"""
Verifies a signature using a public key.

This function takes a hash value, a signature, and a public key to verify the authenticity 
of the signature. It returns `True` if the signature is valid, otherwise returns `False`.

@param hash_value: The original hash value, represented as a hexadecimal string.
@param signature: The signature to verify, represented as a hexadecimal string.
@param public_key_path: Path to the public key file in PEM format. The file must be 
                        accessible and contain a valid RSA public key.

@returns bool: `True` if the signature is valid, `False` otherwise.

@raises FileNotFoundError: If the public key file cannot be found or opened.
@raises ValueError: If the hash value or signature is invalid, or the public key is not 
                    in the correct format.
@raises Exception: If verification fails for any other reason.

@example
# Example usage of verify_signature_with_public_key:
hash_value = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
signature = "b3f2a1e6f1a2c94f88e45d067e76c58abefbeee44c8a8453c817bd7a4b8b0a6e"
public_key_path = "public_key.pem"

try:
    is_valid = verify_signature_with_public_key(hash_value, signature, public_key_path)
    if is_valid:
        print("Signature is valid.")
    else:
        print("Signature is invalid.")
except Exception as e:
    print(f"An error occurred: {e}")
"""
def verify_signature_with_public_key(hash_value: str, signature: str, public_key_path: str) -> bool: 
    with open(public_key_path, 'rb') as key_file:
        public_key = serialization.load_pem_public_key(
            key_file.read(),
            backend=default_backend()
        )
    try:
        public_key.verify(
            bytes.fromhex(signature),
            bytes.fromhex(hash_value),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return True
    except Exception as e:
        print(f"Verification failed: {e}")
        return False
    



SIGNATURE_LENGTH = 4096
SIGNATURE_LENGTH_BYTES = SIGNATURE_LENGTH // 8
SIGNATURE_LENGTH_HEX = SIGNATURE_LENGTH_BYTES * 2
"""
Signs a PDF file by inserting a digital signature using a private key.

This function copies the input PDF to the output path, checks if a signature placeholder 
exists, and if not, creates one. It then calculates the SHA-256 hash of the PDF excluding 
the placeholder section, signs this hash with the specified private key, and replaces 
the placeholder in the output PDF with the generated signature.

@param input_pdf_path: Path to the original PDF file to be signed.
@param output_pdf_path: Path where the signed PDF will be saved.
@param private_key_path: Path to the private key file (PEM format) used for signing.

@returns None

@raises FileNotFoundError: If any of the input files (PDF or private key) cannot be found.
@raises ValueError: If signature placeholder is not found or signature length is invalid.
@raises Exception: For other errors such as issues with hashing, signing, or file I/O.

@example
# Example usage of sign_pdf_using_private_key:
input_pdf = "document.pdf"
output_pdf = "signed_document.pdf"
private_key = "private_key.pem"

try:
    sign_pdf_using_private_key(input_pdf, output_pdf, private_key)
    print("PDF successfully signed.")
except Exception as e:
    print(f"An error occurred during signing: {e}")
"""
def sign_pdf_using_private_key(input_pdf_path: str, output_pdf_path: str, private_key_path: str) -> None:
    shutil.copy(input_pdf_path, output_pdf_path)   
    if(find_signature(output_pdf_path) is not None):
        print("Signature already exists.")
    else:
        create_pdf_placeholder(input_pdf_path, output_pdf_path, SIGNATURE_LENGTH_HEX)
    signature_positon = find_signature(output_pdf_path)

    hash = calculate_sha256(output_pdf_path, signature_positon, SIGNATURE_LENGTH_HEX)
    print(f"Hash value({len(hash)}): {hash}")
    signature = sign_hash_with_private_key(hash, private_key_path)
    print(f"Signature({len(signature)}): {signature}")

    replace_bytes_at_offset(output_pdf_path, signature_positon, signature.encode(), output_pdf_path)
    print(f"Signed PDF: {input_pdf_path} to: {output_pdf_path}")
"""
Verifies the digital signature of a signed PDF file using a public key.

This function locates the signature placeholder in the PDF, extracts the signature,
calculates the SHA-256 hash of the PDF excluding the signature section, and verifies
the signature against the hash using the provided public key.

@param input_pdf_path: Path to the signed PDF file to verify.
@param public_key_path: Path to the public key file (PEM format) used for verification.

@returns bool: Returns True if the signature is valid, False otherwise.

@raises FileNotFoundError: If the PDF file or public key file cannot be found.
@raises ValueError: If the signature placeholder is missing or signature length is invalid.
@raises Exception: For errors occurring during hashing, signature extraction, or verification.

@example
# Example usage of verify_signed_pdf:
signed_pdf = "signed_document.pdf"
public_key = "public_key.pem"

try:
    is_valid = verify_signed_pdf(signed_pdf, public_key)
    if is_valid:
        print("The PDF signature is valid.")
    else:
        print("The PDF signature is invalid.")
except Exception as e:
    print(f"An error occurred during verification: {e}")
"""
def verify_signed_pdf(input_pdf_path: str, public_key_path: str) -> bool:
    signature_positon = find_signature(input_pdf_path)
    if signature_positon is None:
        print("Signature not found.")
        return False

    hash = calculate_sha256(input_pdf_path, signature_positon, SIGNATURE_LENGTH_HEX)
    signature = get_signature(input_pdf_path, signature_positon, SIGNATURE_LENGTH_HEX)
    print(f"Hash value({len(hash)}): {hash}")
    print(f"Signature({len(signature)}): {signature}")

    verified = verify_signature_with_public_key(hash, signature, public_key_path)
    print(f"Signature verified: {input_pdf_path} with: {public_key_path}")
    return verified


def main():
    parser = argparse.ArgumentParser(description="Aplikacja do podpisywania i weryfikacji plików PDF")
    parser.add_argument('--verify', help="Weryfikacja podpisu", nargs=2, metavar=('input', 'public_key'))
    parser.add_argument('--sign', help="Podpisywanie pliku", nargs=3, metavar=('input', 'output', 'private_key'))
    args = parser.parse_args()

    if args.verify:
        input_path, public_key_path = args.verify
        v = verify_signed_pdf(input_path, public_key_path)
        print(f"Weryfikacja podpisu zakończona. Plik: {input_path}, Klucz publiczny: {public_key_path}. Wynik: {v}")

    elif args.sign:
        input_path, output_path, private_key_path = args.sign
        sign_pdf_using_private_key(input_path, output_path, private_key_path)
        print(f"Podpisano plik PDF: {input_path} i zapisano jako: {output_path}")

    else:
        print("Brak wymaganych argumentów. Użyj --help, aby zobaczyć dostępne opcje.")

if __name__ == '__main__':
    main()
import shutil
import hashlib
import argparse
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from typing import Optional

import pypdf
from pypdf.generic import DictionaryObject, NameObject, create_string_object

from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

def decrypt_with_aes(encrypted_data: bytes, aes_key: bytes) -> str:
    if not aes_key or len(aes_key) != 32:
        raise ValueError('Invalid AES key. Expected a 256-bit key.')

    try:
        cipher = AES.new(aes_key, AES.MODE_ECB)
        decrypted = unpad(cipher.decrypt(encrypted_data), AES.block_size)
        print('Decrypted data:', decrypted.decode('utf-8'))  # Debug
        return decrypted.decode('utf-8')
    except Exception as e:
        print('Decryption error:', e)
        raise

def create_pdf_placeholder(
    input_pdf_path: str, output_pdf_path: str, signature_length: int
) -> None:
    with open(input_pdf_path, "rb") as input_file, open(
        output_pdf_path, "wb"
    ) as output_file:
        reader = pypdf.PdfReader(input_file)
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            writer.add_page(page)
        sig_dict = DictionaryObject()
        sig_dict.update(
            {
                NameObject("/Type"): NameObject("/BskSignature"),
                NameObject("/Contents"): create_string_object(
                    "0" * signature_length
                ),  # ByteStringObject( random.randbytes(signature_length // 8) ), # rsa 4096
            }
        )
        writer._add_object(sig_dict)  # type: ignore
        writer.write(output_file)


def replace_bytes_at_offset(
    file_path: str, offset: int, new_bytes: bytes, output_path: Optional[str] = None
) -> None:
    with open(file_path, "rb") as f:
        content = bytearray(f.read())
    if offset < 0 or offset + len(new_bytes) > len(content):
        raise ValueError("Wrong offset.")
    content[offset : offset + len(new_bytes)] = new_bytes
    if output_path is None:
        output_path = file_path
    with open(output_path, "wb") as f:
        f.write(content)


def find_signature(pdf_path: str) -> Optional[int]:
    with open(pdf_path, "rb") as f:
        pattern = b"/Type /BskSignature\n/Contents ("
        position = f.read().find(pattern)
        if position != -1:
            position += len(pattern)
            print(f"Found placeholder at: {position}")
            return position
    return None


def get_signature(pdf_path: str, position: int, signature_length: int) -> str:
    with open(pdf_path, "rb") as f:
        f.seek(position)
        signature_data = f.read(signature_length)
        return signature_data.decode()


def calculate_sha256(
    file_path: str, start_position: int, length_of_section: int
) -> str:
    with open(file_path, "rb") as file:
        file.seek(0)
        data_before = file.read(start_position)
        file.seek(start_position + length_of_section)
        data_after = file.read()
        remaining_data = data_before + data_after
        sha256_hash = hashlib.sha256()
        sha256_hash.update(remaining_data)
        return sha256_hash.hexdigest()


def sign_hash_with_private_key(hash_value: str, private_key_path: str) -> str:
    with open(private_key_path, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(), password=None, backend=default_backend()
        )
    signature = private_key.sign(  # type: ignore
        bytes.fromhex(hash_value), padding.PKCS1v15(), hashes.SHA256()  # type: ignore
    )
    return signature.hex()  # type: ignore


def verify_signature_with_public_key(
    hash_value: str, signature: str, public_key_path: str
) -> bool:
    with open(public_key_path, "rb") as key_file:
        public_key = serialization.load_pem_public_key(
            key_file.read(), backend=default_backend()
        )
    try:
        public_key.verify(  # type: ignore
            bytes.fromhex(signature),
            bytes.fromhex(hash_value),
            padding.PKCS1v15(),  # type: ignore
            hashes.SHA256(),  # type: ignore
        )
        return True
    except Exception as e:
        print(f"Verification failed: {e}")
        return False


SIGNATURE_LENGTH = 4096
SIGNATURE_LENGTH_BYTES = SIGNATURE_LENGTH // 8
SIGNATURE_LENGTH_HEX = SIGNATURE_LENGTH_BYTES * 2


def sign_pdf_using_private_key(
    input_pdf_path: str, output_pdf_path: str, private_key_path: str
) -> None:
    shutil.copy(input_pdf_path, output_pdf_path)
    if find_signature(output_pdf_path) is not None:
        print("Signature already exists.")
    else:
        create_pdf_placeholder(input_pdf_path, output_pdf_path, SIGNATURE_LENGTH_HEX)

    signature_positon: int = find_signature(output_pdf_path)  # type: ignore

    hash = calculate_sha256(output_pdf_path, signature_positon, SIGNATURE_LENGTH_HEX)
    print(f"Hash value({len(hash)}): {hash}")
    signature = sign_hash_with_private_key(hash, private_key_path)
    print(f"Signature({len(signature)}): {signature}")

    replace_bytes_at_offset(
        output_pdf_path, signature_positon, signature.encode(), output_pdf_path
    )
    print(f"Signed PDF: {input_pdf_path} to: {output_pdf_path}")


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
    parser = argparse.ArgumentParser(
        description="Application for signing and verifying PDF files"
    )
    parser.add_argument(
        "--verify", help="Verify signature", nargs=2, metavar=("input", "public_key")
    )
    parser.add_argument(
        "--sign",
        help="Sign PDF file",
        nargs=3,
        metavar=("input", "output", "private_key"),
    )
    args = parser.parse_args()

    if args.verify:
        input_path, public_key_path = args.verify
        v = verify_signed_pdf(input_path, public_key_path)
        print(
            f"Signature verification completed. File: {input_path}, Public key: {public_key_path}. Result: {v}"
        )
        if not v:
            print("Signature verification failed.")
            exit(1)
        else:
            print("Signature verification succeeded.")
            exit(0)
    elif args.sign:
        input_path, output_path, private_key_path = args.sign
        sign_pdf_using_private_key(input_path, output_path, private_key_path)
        print(f"Signed PDF file: {input_path} and saved as: {output_path}")
    else:
        print("Missing required arguments. Use --help to see available options.")


if __name__ == "__main__":
    main()

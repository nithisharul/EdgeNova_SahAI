import unittest

from backend.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class AuthTests(unittest.TestCase):
    def test_password_hashing_round_trip(self):
        raw = "SecretPass123!"
        hashed = hash_password(raw)
        self.assertNotEqual(raw, hashed)
        self.assertTrue(verify_password(raw, hashed))
        self.assertFalse(verify_password("wrong-password", hashed))

    def test_token_round_trip(self):
        token = create_access_token({"sub": "user-42", "role": "treasurer"})
        payload = decode_access_token(token)
        self.assertEqual(payload["sub"], "user-42")
        self.assertEqual(payload["role"], "treasurer")


if __name__ == "__main__":
    unittest.main()

package com.ticketmanagement.authservice.util;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PasswordGenerator {
    private static final String UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // omit I, O
    private static final String LOWERCASE = "abcdefghjkmnpqrstuvwxyz"; // omit i, l, o
    private static final String DIGITS = "23456789"; // omit 0,1
    private static final String SPECIAL = "!@#$%^&*";

    private static final SecureRandom random = new SecureRandom();

    public static String generateTemporaryPassword(int length) {
        List<Character> chars = new ArrayList<>();
        chars.add(getRandomChar(UPPERCASE));
        chars.add(getRandomChar(LOWERCASE));
        chars.add(getRandomChar(DIGITS));
        chars.add(getRandomChar(SPECIAL));

        String allChars = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;
        for (int i = 4; i < length; i++) {
            chars.add(getRandomChar(allChars));
        }

        Collections.shuffle(chars, random);
        StringBuilder sb = new StringBuilder();
        for (char c : chars) {
            sb.append(c);
        }
        return sb.toString();
    }

    private static char getRandomChar(String characters) {
        int index = random.nextInt(characters.length());
        return characters.charAt(index);
    }
}

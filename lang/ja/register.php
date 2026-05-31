<?php

declare(strict_types=1);

return [
    // メッセージ（validation.key 形式）
    'messages' => [
        'name.required' => ':attributeは必須です。',
        'name.max' => ':attributeは255文字以内で入力してください。',
        'email.required' => ':attributeは必須です。',
        'email.email' => ':attributeの形式が正しくありません。',
        'email.unique' => 'この:attributeは既に登録されています。',
        'password.required' => ':attributeは必須です。',
        'password.confirmed' => ':attributeが一致しません。',
        'password.min' => ':attributeは8文字以上で入力してください。',
        'password.mixed_case' => ':attributeは大文字と小文字を含む必要があります。',
        'password.numbers' => ':attributeは数字を含む必要があります。',
        'password.symbols' => ':attributeは記号を含む必要があります。',
        'password.uncompromised' => 'この:attributeは漏洩の可能性があります。別の:attributeを使用してください。',
    ],

    // 属性名
    'attributes' => [
        'name' => '名前',
        'email' => 'メールアドレス',
        'password' => 'パスワード',
    ],
];

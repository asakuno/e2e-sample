FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

# ホストとの権限問題を回避するためのユーザー設定
# ベースイメージにはubuntu(1000:1000)とpwuser(1001:1001)が存在
ARG USER_ID=1000
ARG GROUP_ID=1000

# 既存のubuntuユーザーを削除し、pwuserのID を変更
RUN userdel -r ubuntu 2>/dev/null || true && \
    groupmod -g ${GROUP_ID} pwuser && \
    usermod -u ${USER_ID} -g ${GROUP_ID} pwuser && \
    chown -R ${USER_ID}:${GROUP_ID} /home/pwuser

USER pwuser

CMD ["npx", "playwright", "test"]

#!/bin/sh
set -e

echo "$OS_NAME"
if [ "$OS_NAME" = "Linux" ]; then
    useradd -u "$USER_ID" "$USER_NAME" && echo "Add user $USER_NAME($USER_ID)"
    groupadd -g "$GROUP_ID" "$GROUP_NAME" && echo "Add group $GROUP_NAME($GROUP_ID)"
    gpasswd -a "$USER_NAME" "$GROUP_NAME" && echo "Assign $USER_NAME to $GROUP_NAME"
    mkdir "/home/$USER_NAME" 2>/dev/null || echo "/home/$USER_NAME already exists."
    chown -R "$USER_NAME:$GROUP_NAME" "/home/$USER_NAME"
fi
whoami


if [ "${1#-}" != "$1" ]; then
	set -- php "$@"
fi

exec "$@"
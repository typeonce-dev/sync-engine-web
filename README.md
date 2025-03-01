# Async Sync Engine
[Source](https://x.com/i/grok?conversation=1893597036278100311)

1. Init: Store clientId locally.
2. Create: Owner creates workshop, gets masterToken, stores it.
3. Share: Owner issues accessToken for collaborator, shares manually.
4. Access: Collaborator inputs workshopId and accessToken, downloads data.
5. Sync: Clients edit locally, sync with server using their token.
6. Revoke: Owner revokes access, collaborator’s token fails.
7. Expiry: Client handles token expiration gracefully.

> Allow user to check all changes (syncs) by selecting history by `workspaceId` (`"read"` scope?)
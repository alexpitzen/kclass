export const LoginAssistantsList = () => {
    const isAndroid = /[Aa]ndroid/.test(navigator.userAgent);

    const logins = [
        { id: 1, name: 'Dhanya' },
        { id: 4, name: 'Alex' },
        { id: 5, name: 'Ibrahim' },
        { id: 8, name: 'Samarth' },
        { id: 12, name: 'Nainika' },
        { id: 13, name: 'Arsheen' },
        { id: 15, name: 'Parvathy' },
        { id: 16, name: 'Yen' },
        { id: 18, name: 'Saniya' },
        { id: 19, name: 'Shivansh' },
        { id: 20, name: 'Jerry' },
    ];

    return (
        <details class="loginAssistantsList" open={!isAndroid}>
            <summary>Logins</summary>
            <ul>
                {logins.map(login => (
                    <li key={login.id}>{login.id}: {login.name}</li>
                ))}
            </ul>
        </details>
    );
};

export const RefreshButton = () => (
    <button
        class="loginRefreshBtn"
        onClick={() => window.location.href = window.location.href}
        title="refresh"
    >refresh</button>
);

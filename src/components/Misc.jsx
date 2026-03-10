export const LoginAssistantsList = () => {
    const isAndroid = /[Aa]ndroid/.test(navigator.userAgent);

    const logins = [
        { id: 1, name: 'Dhanya' },
        { id: 2, name: 'Gowri' },
        { id: 3, name: 'Gautham' },
        { id: 4, name: 'Alex' },
        { id: 5, name: 'Ibrahim' },
        { id: 6, name: 'Neethi' },
        { id: 7, name: 'Ridhima' },
        { id: 8, name: 'Samarth' },
        { id: 10, name: 'Vaishnavi' },
        { id: 12, name: 'Nainika' },
        { id: 13, name: 'Arsheen' },
        { id: 14, name: 'Parthini' },
        { id: 15, name: 'Parvathy' },
        { id: 16, name: 'Yen' },
        { id: 17, name: 'Priya' },
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

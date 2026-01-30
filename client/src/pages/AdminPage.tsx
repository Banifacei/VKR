import './AdminPage.css';

export const AdminPage = () => {
  return (
    <div className="lumeo-layout">
        <header className="lumeo-header" style={{ borderBottom: '1px solid #333', background: '#222' }}>
             <div className="logo" style={{ color: '#ff4d4d' }}>Lumeo <span style={{color: 'white', fontSize: '14px', fontWeight: 'normal'}}>| Super Admin</span></div>
        </header>

        <div className="lumeo-container" style={{ padding: '40px', display: 'block', overflowY: 'auto' }}>
            <h1>Системная панель</h1>
            <p style={{ color: '#888', marginBottom: '30px' }}>Управление пользователями и настройки сервера</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {/* Карточка 1 */}
                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#888', fontSize: '14px' }}>ВСЕГО УРОКОВ</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginTop: '10px' }}>12</div>
                </div>

                {/* Карточка 2 */}
                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#888', fontSize: '14px' }}>АКТИВНЫЕ СТУДЕНТЫ</h3>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#00aeef', marginTop: '10px' }}>42</div>
                </div>

                {/* Карточка 3 */}
                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                    <h3 style={{ color: '#888', fontSize: '14px' }}>СТАТУС СЕРВЕРА</h3>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4dff88', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '10px', height: '10px', background: '#4dff88', borderRadius: '50%', boxShadow: '0 0 10px #4dff88' }}></span>
                        Online
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '40px', background: '#1a1a1a', padding: '30px', borderRadius: '12px', border: '1px solid #333' }}>
                <h3>Управление пользователями</h3>
                <p style={{ color: '#666', marginTop: '10px' }}>Функционал в разработке...</p>
                <div style={{ marginTop: '20px', height: '1px', background: '#333' }}></div>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button className="primary-btn" style={{ background: '#333' }}>Добавить препода</button>
                    <button className="primary-btn" style={{ background: '#333' }}>Настройки LDAP</button>
                </div>
            </div>
        </div>
    </div>
  );
};
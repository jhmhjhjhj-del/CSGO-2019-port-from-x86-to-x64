// Minimal Windows x64 rebuild of Valve socketlib for Panorama link.
#include "socketlib/socketlib.h"
#include "tier0/dbg.h"
#include <ws2tcpip.h>

#pragma comment(lib, "ws2_32.lib")

timeval g_zeroTimeout = { 0, 0 };

static int s_nWsaRef = 0;

void SocketLibInit()
{
	if ( s_nWsaRef++ == 0 )
	{
		WSADATA wsa;
		WSAStartup( MAKEWORD( 2, 2 ), &wsa );
	}
}

void SocketLibShutdown()
{
	if ( s_nWsaRef > 0 && --s_nWsaRef == 0 )
		WSACleanup();
}

const char* ConvertWinsockErrorToString( int errorCode )
{
	static char buf[64];
	V_snprintf( buf, sizeof( buf ), "WSA %d", errorCode );
	return buf;
}

const char* ConvertSocketLibErrorToString( SocketErrorCode_t errorCode )
{
	static char buf[64];
	V_snprintf( buf, sizeof( buf ), "SocketErr %d", (int)errorCode );
	return buf;
}

void ByteSwapInPlaceMessageHeader( MessageHeader_t* messageHeader )
{
	if ( !messageHeader )
		return;
	messageHeader->m_nLength = ntohl( messageHeader->m_nLength );
}

CSocketConnection::CSocketConnection()
{
	m_ListeningSocket = InvalidSocketHandle;
	m_ListeningSocketState = SSTATE_UNINITIALIZED;
	m_ConnectionType = CT_INDETERMINATE;
	m_SocketProtocol = SP_INDETERMINATE;
	m_LastError = SOCKET_SUCCESS;
	m_LastSystemError = 0;
	for ( int i = 0; i < MAX_SERVER_CONNECTIONS; i++ )
	{
		m_EndpointSockets[i] = InvalidSocketHandle;
		m_EndpointStates[i] = SSTATE_UNINITIALIZED;
	}
}

CSocketConnection::~CSocketConnection()
{
	Cleanup();
}

SocketHandle_t CSocketConnection::CreateNewSocket()
{
	int type = ( m_SocketProtocol == SP_UDP ) ? SOCK_DGRAM : SOCK_STREAM;
	int proto = ( m_SocketProtocol == SP_UDP ) ? IPPROTO_UDP : IPPROTO_TCP;
	SOCKET s = socket( AF_INET, type, proto );
	return GetSocketHandle( s );
}

void CSocketConnection::ResetEndpoint( int endpointIndex )
{
	if ( endpointIndex < 0 || endpointIndex >= MAX_SERVER_CONNECTIONS )
		return;
	SOCKET s = GetPlatformSocket( m_EndpointSockets[endpointIndex] );
	if ( s != INVALID_SOCKET )
		closesocket( s );
	m_EndpointSockets[endpointIndex] = InvalidSocketHandle;
	m_EndpointStates[endpointIndex] = SSTATE_UNINITIALIZED;
}

SocketErrorCode_t CSocketConnection::Init( ConnectionType_t connectionType, SocketProtocol_t socketProtocol )
{
	Cleanup();
	m_ConnectionType = connectionType;
	m_SocketProtocol = socketProtocol;
	m_LastError = SOCKET_SUCCESS;
	return SOCKET_SUCCESS;
}

void CSocketConnection::Cleanup()
{
	SOCKET listen = GetPlatformSocket( m_ListeningSocket );
	if ( listen != INVALID_SOCKET )
		closesocket( listen );
	m_ListeningSocket = InvalidSocketHandle;
	m_ListeningSocketState = SSTATE_UNINITIALIZED;
	for ( int i = 0; i < MAX_SERVER_CONNECTIONS; i++ )
		ResetEndpoint( i );
	m_ConnectionType = CT_INDETERMINATE;
	m_SocketProtocol = SP_INDETERMINATE;
}

SocketErrorCode_t CSocketConnection::Listen( uint16 localPort, int numAllowedConnections )
{
	if ( m_ConnectionType != CT_SERVER )
		return m_LastError = SOCKET_ERR_OPERATION_NOT_SUPPORTED;

	m_ListeningSocket = CreateNewSocket();
	SOCKET s = GetPlatformSocket( m_ListeningSocket );
	if ( s == INVALID_SOCKET )
		return m_LastError = SOCKET_ERR_CREATE_FAILED;

	sockaddr_in addr = {};
	addr.sin_family = AF_INET;
	addr.sin_addr.s_addr = htonl( INADDR_ANY );
	addr.sin_port = htons( localPort );
	if ( bind( s, (sockaddr*)&addr, sizeof( addr ) ) != 0 )
		return m_LastError = SOCKET_ERR_BIND_OPERATION_FAILED;
	if ( listen( s, numAllowedConnections > 0 ? numAllowedConnections : MAX_SERVER_CONNECTION_BACKLOG ) != 0 )
		return m_LastError = SOCKET_ERR_LISTEN_FAILED;

	u_long nonblock = 1;
	ioctlsocket( s, FIONBIO, &nonblock );
	m_ListeningSocketState = SSTATE_LISTENING;
	return SOCKET_SUCCESS;
}

SocketErrorCode_t CSocketConnection::TryAcceptIncomingConnection( int *newEndpointIndex )
{
	*newEndpointIndex = INVALID_ENDPOINT_INDEX;
	SOCKET listen = GetPlatformSocket( m_ListeningSocket );
	if ( listen == INVALID_SOCKET )
		return m_LastError = SOCKET_ERR_INVALID_CONNECTION;

	SOCKET client = accept( listen, NULL, NULL );
	if ( client == INVALID_SOCKET )
		return m_LastError = SOCKET_ERR_NO_INCOMING_CONNECTIONS;

	int slot = GetFirstAvailableListeningEndpoint();
	if ( slot < 0 )
	{
		closesocket( client );
		return m_LastError = SOCKET_ERR_NO_AVAILABLE_ENDPOINTS;
	}
	u_long nonblock = 1;
	ioctlsocket( client, FIONBIO, &nonblock );
	m_EndpointSockets[slot] = GetSocketHandle( client );
	m_EndpointStates[slot] = SSTATE_CONNECTED;
	*newEndpointIndex = slot;
	return SOCKET_SUCCESS;
}

int CSocketConnection::GetFirstAvailableListeningEndpoint()
{
	for ( int i = 0; i < MAX_SERVER_CONNECTIONS; i++ )
	{
		if ( m_EndpointStates[i] == SSTATE_UNINITIALIZED )
			return i;
	}
	return INVALID_ENDPOINT_INDEX;
}

SocketState_t CSocketConnection::GetListeningSocketState()
{
	return m_ListeningSocketState;
}

SocketErrorCode_t CSocketConnection::ConnectToServer( const char *hostName, uint16 hostPort )
{
	if ( m_ConnectionType != CT_CLIENT )
		return m_LastError = SOCKET_ERR_OPERATION_NOT_SUPPORTED;

	ResetEndpoint( 0 );
	m_EndpointSockets[0] = CreateNewSocket();
	SOCKET s = GetPlatformSocket( m_EndpointSockets[0] );
	if ( s == INVALID_SOCKET )
		return m_LastError = SOCKET_ERR_CREATE_FAILED;

	addrinfo hints = {};
	hints.ai_family = AF_INET;
	hints.ai_socktype = ( m_SocketProtocol == SP_UDP ) ? SOCK_DGRAM : SOCK_STREAM;
	char portStr[16];
	V_snprintf( portStr, sizeof( portStr ), "%u", hostPort );
	addrinfo *result = NULL;
	if ( getaddrinfo( hostName, portStr, &hints, &result ) != 0 || !result )
		return m_LastError = SOCKET_ERR_HOST_NOT_FOUND;

	u_long nonblock = 1;
	ioctlsocket( s, FIONBIO, &nonblock );
	int rc = connect( s, result->ai_addr, (int)result->ai_addrlen );
	freeaddrinfo( result );
	if ( rc == 0 )
	{
		m_EndpointStates[0] = SSTATE_CONNECTED;
		return SOCKET_SUCCESS;
	}
	int err = WSAGetLastError();
	if ( err == WSAEWOULDBLOCK || err == WSAEINPROGRESS )
	{
		m_EndpointStates[0] = SSTATE_CONNECTION_IN_PROGRESS;
		return SOCKET_SUCCESS;
	}
	m_LastSystemError = err;
	return m_LastError = SOCKET_ERR_CONNECT_FAILED;
}

SocketErrorCode_t CSocketConnection::PollClientConnectionState( bool *isConnected, timeval &timeout )
{
	*isConnected = false;
	SOCKET s = GetPlatformSocket( m_EndpointSockets[0] );
	if ( s == INVALID_SOCKET )
		return m_LastError = SOCKET_ERR_INVALID_CONNECTION;

	if ( m_EndpointStates[0] == SSTATE_CONNECTED )
	{
		*isConnected = true;
		return SOCKET_SUCCESS;
	}

	fd_set wset, eset;
	FD_ZERO( &wset ); FD_ZERO( &eset );
	FD_SET( s, &wset ); FD_SET( s, &eset );
	timeval tv = timeout;
	int rc = select( 0, NULL, &wset, &eset, &tv );
	if ( rc > 0 && FD_ISSET( s, &wset ) )
	{
		m_EndpointStates[0] = SSTATE_CONNECTED;
		*isConnected = true;
		return SOCKET_SUCCESS;
	}
	if ( rc > 0 && FD_ISSET( s, &eset ) )
		return m_LastError = SOCKET_ERR_CONNECT_FAILED;
	return SOCKET_SUCCESS;
}

SocketState_t CSocketConnection::GetEndpointSocketState( int endpointIndex )
{
	if ( endpointIndex < 0 || endpointIndex >= MAX_SERVER_CONNECTIONS )
		return SSTATE_UNINITIALIZED;
	return m_EndpointStates[endpointIndex];
}

static SocketErrorCode_t PollFd( SOCKET s, bool write, bool *ready, timeval &timeout )
{
	*ready = false;
	if ( s == INVALID_SOCKET )
		return SOCKET_ERR_INVALID_CONNECTION;
	fd_set set;
	FD_ZERO( &set );
	FD_SET( s, &set );
	timeval tv = timeout;
	int rc = write ? select( 0, NULL, &set, NULL, &tv ) : select( 0, &set, NULL, NULL, &tv );
	if ( rc > 0 && FD_ISSET( s, &set ) )
		*ready = true;
	return SOCKET_SUCCESS;
}

SocketErrorCode_t CSocketConnection::CanReadFromEndpoint( int endpointIndex, bool *canRead, timeval &timeout )
{
	return PollFd( GetPlatformSocket( m_EndpointSockets[endpointIndex] ), false, canRead, timeout );
}

SocketErrorCode_t CSocketConnection::CanWriteToEndpoint( int endpointIndex, bool *canWrite, timeval &timeout )
{
	return PollFd( GetPlatformSocket( m_EndpointSockets[endpointIndex] ), true, canWrite, timeout );
}

SocketErrorCode_t CSocketConnection::CanReadFromListeningSocket( bool *canRead, timeval &timeout )
{
	return PollFd( GetPlatformSocket( m_ListeningSocket ), false, canRead, timeout );
}

SocketErrorCode_t CSocketConnection::ReadFromEndpoint( int endpointIndex, byte *destinationBuffer, int bufferSize, int *bytesRead )
{
	*bytesRead = 0;
	SOCKET s = GetPlatformSocket( m_EndpointSockets[endpointIndex] );
	if ( s == INVALID_SOCKET )
		return m_LastError = SOCKET_ERR_INVALID_CONNECTION;
	int n = recv( s, (char*)destinationBuffer, bufferSize, 0 );
	if ( n == 0 )
		return m_LastError = SOCKET_ERR_CONNECTION_CLOSED;
	if ( n < 0 )
	{
		int err = WSAGetLastError();
		m_LastSystemError = err;
		if ( err == WSAEWOULDBLOCK )
			return m_LastError = SOCKET_ERR_READ_OPERATION_WOULD_BLOCK;
		return m_LastError = SOCKET_ERR_READ_OPERATION_FAILED;
	}
	*bytesRead = n;
	return SOCKET_SUCCESS;
}

SocketErrorCode_t CSocketConnection::WriteToEndpoint( int endpointIndex, byte *sourceBuffer, int bufferSize, int *bytesWritten )
{
	*bytesWritten = 0;
	SOCKET s = GetPlatformSocket( m_EndpointSockets[endpointIndex] );
	if ( s == INVALID_SOCKET )
		return m_LastError = SOCKET_ERR_INVALID_CONNECTION;
	int n = send( s, (const char*)sourceBuffer, bufferSize, 0 );
	if ( n < 0 )
	{
		int err = WSAGetLastError();
		m_LastSystemError = err;
		if ( err == WSAEWOULDBLOCK )
			return m_LastError = SOCKET_ERR_WRITE_OPERATION_WOULD_BLOCK;
		return m_LastError = SOCKET_ERR_WRITE_OPERATION_FAILED;
	}
	*bytesWritten = n;
	return SOCKET_SUCCESS;
}

const char* CSocketConnection::GetLastSystemErrorString() const
{
	return ConvertWinsockErrorToString( m_LastSystemError );
}

const char* CSocketConnection::GetLastErrorString() const
{
	return ConvertSocketLibErrorToString( m_LastError );
}

// --- Message builder (simplified stream framing) ---

CSocketMessageBuilder::CSocketMessageBuilder( int initialSize, int growSize )
	: m_nHeaderBytesRead( 0 )
	, m_nMessageBytesRead( 0 )
	, m_pConnection( NULL )
	, m_nConnectionEndpoint( 0 )
	, m_MessageData( 0, 0, 0 )
	, m_PartialMessageBytesSent( 0 )
	, m_PartialMessageBytesTotal( 0 )
	, m_bSendingPartialMessage( false )
	, m_nRecvBufSize( 0 )
	, m_pRecvBuf( NULL )
	, m_bSwappedHeader( false )
{
	memset( &m_MessageHeader, 0, sizeof( m_MessageHeader ) );
	(void)( initialSize );
	(void)( growSize );
}

CSocketMessageBuilder::~CSocketMessageBuilder()
{
	delete[] m_pRecvBuf;
}

void CSocketMessageBuilder::SetMaxExpectedMsgSize( int expectedSize )
{
	(void)( expectedSize );
}

void CSocketMessageBuilder::FeedData( const void *data, int dataLength, NetworkMessageHandler networkMessageHandlerFunc, void *userContext )
{
	(void)( data ); (void)( dataLength ); (void)( networkMessageHandlerFunc ); (void)( userContext );
}

void CSocketMessageBuilder::AssignConnection( CSocketConnection* pConnection, int endpoint )
{
	m_pConnection = pConnection;
	m_nConnectionEndpoint = endpoint;
}

SocketErrorCode_t CSocketMessageBuilder::SendDataPacket( const void* RESTRICT data, int dataLength )
{
	return SendDataPacket( m_pConnection, m_nConnectionEndpoint, data, dataLength );
}

SocketErrorCode_t CSocketMessageBuilder::SendDataPacket( CSocketConnection* pConnection, int endpoint, const void* RESTRICT data, int dataLength )
{
	if ( !pConnection )
		return SOCKET_ERR_INVALID_CONNECTION;
	MessageHeader_t hdr;
	hdr.m_nLength = htonl( (uint32)dataLength );
	int written = 0;
	SocketErrorCode_t err = pConnection->WriteToEndpoint( endpoint, (byte*)&hdr, sizeof( hdr ), &written );
	if ( err != SOCKET_SUCCESS )
		return err;
	return pConnection->WriteToEndpoint( endpoint, (byte*)data, dataLength, &written );
}

SocketErrorCode_t CSocketMessageBuilder::BeginSendPartialDataPacket( uint32 totalSize, const void* RESTRICT data, int dataLength )
{
	return BeginSendPartialDataPacket( m_pConnection, m_nConnectionEndpoint, totalSize, data, dataLength );
}

SocketErrorCode_t CSocketMessageBuilder::BeginSendPartialDataPacket( CSocketConnection* pConnection, int endpoint, uint32 totalSize, const void* RESTRICT data, int dataLength )
{
	(void)( totalSize );
	return SendDataPacket( pConnection, endpoint, data, dataLength );
}

bool CSocketMessageBuilder::WaitForIncomingMessage( DWORD timeOutValue )
{
	(void)( timeOutValue );
	return false;
}

void* CSocketMessageBuilder::GetIncomingMessageData() { return NULL; }
uint32 CSocketMessageBuilder::GetIncomingMessageLen() { return 0; }

void CSocketMessageBuilder::FeedDataManual( const void* RESTRICT data, int dataLength )
{
	(void)( data ); (void)( dataLength );
}

bool CSocketMessageBuilder::HasCompleteMessageManual() { return false; }
bool CSocketMessageBuilder::GetCurrentMessageManual( void*& msgData, uint32& msgSize )
{
	msgData = NULL; msgSize = 0; return false;
}
bool CSocketMessageBuilder::DiscardCurrentMessageManual() { return false; }

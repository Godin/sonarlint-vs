using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;

namespace SonarLint.Cpp
{
    interface CommunicationChannel
    {
        Stream WaitForConnection();
    }

    public class SocketCommunicationChannel : CommunicationChannel
    {
        private TcpListener tcpListener;

        public SocketCommunicationChannel()
        {
            tcpListener = new TcpListener(IPAddress.Parse("127.0.0.1"), 9999);
            tcpListener.Start();
        }

        public Stream WaitForConnection()
        {
            Socket socket = tcpListener.AcceptSocket();
            return new NetworkStream(socket);
        }
    }

    public class PipeCommunicationChannel : CommunicationChannel
    {
        private NamedPipeServerStream pipe;

        public PipeCommunicationChannel()
        {
            pipe = new NamedPipeServerStream("SonarLint.Cpp", PipeDirection.InOut);
        }

        public Stream WaitForConnection()
        {
            pipe.WaitForConnection();
            return pipe;
        }
    }
}

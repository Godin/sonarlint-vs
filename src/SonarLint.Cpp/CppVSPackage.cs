using System;
using System.ComponentModel.Design;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Runtime.InteropServices;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.OLE.Interop;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.Win32;
using EnvDTE;
using System.Net.Sockets;
using Google.Protobuf;
using System.Collections.Generic;
using System.Linq;

namespace SonarLint.Cpp
{
    /// <summary>
    /// This is the class that implements the package exposed by this assembly.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The minimum requirement for a class to be considered a valid package for Visual Studio
    /// is to implement the IVsPackage interface and register itself with the shell.
    /// This package uses the helper classes defined inside the Managed Package Framework (MPF)
    /// to do it: it derives from the Package class that provides the implementation of the
    /// IVsPackage interface and uses the registration attributes defined in the framework to
    /// register itself and its components with the shell. These attributes tell the pkgdef creation
    /// utility what data to put into .pkgdef file.
    /// </para>
    /// <para>
    /// To get loaded into VS, the package must be referred by &lt;Asset Type="Microsoft.VisualStudio.VsPackage" ...&gt; in .vsixmanifest file.
    /// </para>
    /// </remarks>
    [PackageRegistration(UseManagedResourcesOnly = true)]
    [InstalledProductRegistration("#110", "#112", "1.0", IconResourceID = 400)] // Info on this package for Help/About
    [Guid(CppVSPackage.PackageGuidString)]
    [ProvideAutoLoad(VSConstants.UICONTEXT.SolutionExists_string)]
    [SuppressMessage("StyleCop.CSharp.DocumentationRules", "SA1650:ElementDocumentationMustBeSpelledCorrectly", Justification = "pkgdef, VS and vsixmanifest are valid VS terms")]
    public sealed class CppVSPackage : Package
    {
        /// <summary>
        /// CppVSPackage GUID string.
        /// </summary>
        public const string PackageGuidString = "079e6dd8-eab3-45d7-98bd-c99d4a19857e";

        /// <summary>
        /// Initializes a new instance of the <see cref="CppVSPackage"/> class.
        /// </summary>
        public CppVSPackage()
        {
            // Inside this method you can place any initialization code that does not require
            // any Visual Studio service because at this point the package object is created but
            // not sited yet inside Visual Studio environment. The place to do all the other
            // initialization is the Initialize method.
        }

        #region Package Members

        /// <summary>
        /// Initialization of the package; this method is called right after the package is sited, so this is the place
        /// where you can put all the initialization code that rely on services provided by VisualStudio.
        /// </summary>
        protected override void Initialize()
        {
            base.Initialize();

            VsShellUtilities.ShowMessageBox(this, "SonarLint.Cpp initialization", "", OLEMSGICON.OLEMSGICON_INFO, OLEMSGBUTTON.OLEMSGBUTTON_OK, OLEMSGDEFBUTTON.OLEMSGDEFBUTTON_FIRST);

            dte = (DTE)GetService(typeof(SDTE));
            documentEvents = dte.Events.DocumentEvents;
            documentEvents.DocumentSaved += documentSaved;
            errorListProvider = new ErrorListProvider(this);
        }

        #endregion

        private static DTE dte;
        private DocumentEvents documentEvents;
        private static ErrorListProvider errorListProvider;

        private void documentSaved(Document document)
        {
            if (document == null || document.Language != "C/C++")
            {
                return;
            }

            // TODO(Godin): should be asynchronous
            updateErrorList(document);
        }

        private void updateErrorList(Document document)
        {
            Project project = document.ProjectItem.ContainingProject;
            Configuration configuration = document.ProjectItem.ConfigurationManager.ActiveConfiguration;

            Request request = createRequest(project.Object, configuration);
            request.File = document.FullName;

            Response response = analyze(request);

            List<ErrorTask> toRemove = new List<ErrorTask>();
            String d = document.FullName;
            IVsHierarchy projectHierarchy = getProjectHierarchy(project);
            foreach (ErrorTask t in errorListProvider.Tasks.OfType<ErrorTask>())
            {
                if (t.Text.StartsWith("SonarQube:") && t.HierarchyItem == projectHierarchy && t.Document == d)
                {
                    toRemove.Add(t);
                }
            }
            foreach (ErrorTask t in toRemove)
            {
                errorListProvider.Tasks.Remove(t);
            }

            foreach (Response.Types.Issue issue in response.Issue)
            {
                var error = new ErrorTask
                {
                    Document = document.FullName,
                    Category = TaskCategory.CodeSense,
                    ErrorCategory = TaskErrorCategory.Warning,
                    Text = "SonarQube: " + issue.Msg,
                    Line = issue.Line,
                    HierarchyItem = projectHierarchy
                };
                error.Navigate += new EventHandler(error_Navigate);
                errorListProvider.Tasks.Add(error);
            }
        }

        private IVsHierarchy getProjectHierarchy(Project project)
        {
            IVsSolution ivSSolution = (IVsSolution)this.GetService(typeof(IVsSolution));
            IVsHierarchy hierarchy = null;
            int hr = ivSSolution.GetProjectOfUniqueName(project.UniqueName, out hierarchy);
            // TODO(Godin): check return value on error code?
            return hierarchy;
        }

        private void error_Navigate(object sender, EventArgs e)
        {
            var error = sender as ErrorTask;
            errorListProvider.Navigate(error, new Guid(EnvDTE.Constants.vsViewKindCode));
        }

        private Request createRequest(dynamic project, Configuration configuration)
        {
            Request request = new Request();
            dynamic config = project.Configurations.Item(configuration.ConfigurationName);
            dynamic toolsCollection = config.Tools;
            foreach (var tool in toolsCollection)
            {
                if (tool.GetType().GetInterface("Microsoft.VisualStudio.VCProjectEngine.VCCLCompilerTool") == null)
                {
                    continue;
                }
                // TODO(Godin): use this data:
                String define = tool.PreprocessorDefinitions;
                String undefine = tool.UndefinePreprocessorDefinitions;
                String[] includes = tool.FullIncludePath.Split(';');
                for (int i = 0; i < includes.Length; i++)
                {
                    includes[i] = config.Evaluate(includes[i]);
                }
                request.SearchPath.Add(includes);
                break;
            }
            return request;
        }

        private Response analyze(Request request)
        {
            Response response;
            try {
                // TODO(Godin): use pipes
                using (TcpClient client = new TcpClient())
                {
                    client.Connect("127.0.0.1", 9999);
                    NetworkStream stream = client.GetStream();
                    request.WriteDelimitedTo(stream);
                    response = Response.Parser.ParseDelimitedFrom(stream);
                    client.Close();
                }
            } catch (Exception e)
            {
                response = new Response();
                response.Issue.Add(new Response.Types.Issue() { Msg = e.Message });
            }
            return response;
        }
    }
}
